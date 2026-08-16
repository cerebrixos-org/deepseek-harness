/**
 * Portable Hyperlake SuperHarness industry-pack registry and model-facing
 * asset catalog.
 * @module @cerebrixos/superharness-packs
 */

import { mkdirSync, readFileSync, realpathSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { load } from 'js-yaml'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { dshHomePath } from '@deepseek-ai/dsh-home-paths'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { SessionId } from '@deepseek-ai/dsh-session'
import type { AssembleContext } from '@deepseek-ai/dsh-system-prompt'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import type {
  PackCatalogEntry, PackCatalogSnapshot, PackConfigureRequest, PackOperationResult,
  PackSelectRequest, PackSelectionResult, PackSetEnabledRequest,
} from './types.ts'

export type * from './types.ts'

/** Categories describe composition intent without creating incompatible formats. */
export type PackCategory = import('./types.ts').PackCategory

/** One explicitly exported file in an industry pack. */
export interface PackAsset {
  /** Stable identity within the pack. */
  id: string
  /** Asset family used for deterministic selection. */
  type: 'ddl' | 'sql' | 'dbt' | 'notebook' | 'semantic-model' | 'dashboard' | 'data-contract' | 'routine' | 'goal' | 'evaluation' | 'reference'
  /** Relative path below the pack root. */
  path: string
  /** Task-oriented description shown to the model. */
  description: string
  /** Optional execution dialect such as ansi-sql or spark-sql. */
  dialect?: string
  /** Compatible adapter ids; an empty list means the asset is descriptive. */
  adapters?: string[]
  /** Whether an adapter may execute this asset without translation. */
  portable?: boolean
  /** Whether using the asset can change customer state. */
  access?: 'read' | 'mutate'
  /** Required admission before a mutating asset is executed. */
  approval?: 'none' | 'required'
}

/** A customer-provided resource required by a pack. */
export interface PackResourceSlot {
  /** Stable logical binding id. */
  id: string
  /** Accepted resource classes. */
  types: string[]
  /** Whether activation requires a concrete binding. */
  required: boolean
  /** Human-readable selection guidance. */
  description: string
}

/** Portable metadata shared by every SuperHarness pack category. */
export interface PackManifest {
  apiVersion: 'packs.hyperlake.cloud/v1alpha1'
  kind: 'SuperHarnessPack'
  metadata: {
    id: string
    version: string
    category: PackCategory
    name: string
    description: string
  }
  requires?: {
    packs?: string[]
    capabilities?: string[]
    oneOfAdapters?: string[]
  }
  provides?: string[]
  /** Existing packs extended by this pack's namespaced assets. */
  contributesTo?: string[]
  resourceSlots?: PackResourceSlot[]
  assets?: PackAsset[]
}

/** A validated pack and its canonical filesystem location. */
export interface RegisteredPack {
  readonly root: string
  readonly manifest: Readonly<PackManifest>
}

/** A concrete customer resource selected for one logical pack slot. */
export type PackResourceBinding = import('./types.ts').PackResourceBinding

/** Deterministic readiness result for activating one installed pack. */
export interface PackValidationResult {
  packId: string
  valid: boolean
  installedAdapters: string[]
  bindings: PackResourceBinding[]
  issues: string[]
}

/** Plugin configuration. */
export interface Config {
  /** Maximum bytes returned by one asset read. */
  maxAssetBytes?: number
  /** Persistent non-secret lifecycle state. */
  statePath?: string
}

const DEFAULT_MAX_ASSET_BYTES = 1_048_576
const ID_PATTERN = /^[a-z0-9][a-z0-9.-]{0,127}$/
const VERSION_PATTERN = /^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?$/
const CATEGORIES = new Set<PackCategory>(['capability', 'adapter', 'domain', 'asset', 'governance', 'solution'])
const ASSET_TYPES = new Set<PackAsset['type']>([
  'ddl', 'sql', 'dbt', 'notebook', 'semantic-model', 'dashboard', 'data-contract',
  'routine', 'goal', 'evaluation', 'reference',
])

declare module '@deepseek-ai/cordis' {
  interface Context {
    hyperlakePacks: SuperHarnessPackRegistry
  }
}

/** Runtime schema for registry configuration. */
export const Config: z<Config> = z.object({
  maxAssetBytes: z.number().step(1).min(1).default(DEFAULT_MAX_ASSET_BYTES),
  statePath: z.string().default(''),
})

interface PersistedPackState {
  enabled: Record<string, boolean>
  bindings: Record<string, PackResourceBinding[]>
}

interface PackRegistrationOptions { defaultEnabled?: boolean }

declare module '@deepseek-ai/dsh-session' {
  interface SessionEventMap {
    'superharness/pack-selected': {
      packId: string
      version: string
      bindings: PackResourceBinding[]
    }
  }
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`)
  }
  return value as Record<string, unknown>
}

function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${label} must be a non-empty string`)
  return value
}

function stringList(value: unknown, label: string): string[] {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string' || item.trim() === '')) {
    throw new Error(`${label} must be an array of non-empty strings`)
  }
  return [...new Set(value as string[])]
}

function optionalRecord(value: unknown, label: string): Record<string, unknown> {
  return value === undefined ? {} : record(value, label)
}

/** Parse and validate one untrusted YAML manifest value. */
export function parsePackManifest(value: unknown): PackManifest {
  const source = record(value, 'pack manifest')
  if (source.apiVersion !== 'packs.hyperlake.cloud/v1alpha1') throw new Error('unsupported pack apiVersion')
  if (source.kind !== 'SuperHarnessPack') throw new Error('pack kind must be SuperHarnessPack')
  const metadata = record(source.metadata, 'metadata')
  const id = text(metadata.id, 'metadata.id')
  if (!ID_PATTERN.test(id)) throw new Error('metadata.id must be a lowercase logical id')
  const version = text(metadata.version, 'metadata.version')
  if (!VERSION_PATTERN.test(version)) throw new Error('metadata.version must be semantic version syntax')
  const category = text(metadata.category, 'metadata.category') as PackCategory
  if (!CATEGORIES.has(category)) throw new Error(`unsupported pack category ${JSON.stringify(category)}`)

  const requiresSource = optionalRecord(source.requires, 'requires')
  const requires = {
    packs: stringList(requiresSource.packs, 'requires.packs'),
    capabilities: stringList(requiresSource.capabilities, 'requires.capabilities'),
    oneOfAdapters: stringList(requiresSource.oneOfAdapters, 'requires.oneOfAdapters'),
  }
  for (const requiredId of requires.packs) {
    if (!ID_PATTERN.test(requiredId)) throw new Error(`invalid required pack id ${JSON.stringify(requiredId)}`)
  }

  const assets = (source.assets ?? []) as unknown
  if (!Array.isArray(assets)) throw new Error('assets must be an array')
  const parsedAssets = assets.map((value, index): PackAsset => {
    const asset = record(value, `assets[${index}]`)
    const assetId = text(asset.id, `assets[${index}].id`)
    if (!ID_PATTERN.test(assetId)) throw new Error(`invalid asset id ${JSON.stringify(assetId)}`)
    const type = text(asset.type, `assets[${index}].type`) as PackAsset['type']
    if (!ASSET_TYPES.has(type)) throw new Error(`unsupported asset type ${JSON.stringify(type)}`)
    const assetPath = text(asset.path, `assets[${index}].path`)
    if (isAbsolute(assetPath)) throw new Error(`asset ${assetId} path must be relative`)
    return {
      id: assetId,
      type,
      path: assetPath,
      description: text(asset.description, `assets[${index}].description`),
      ...(typeof asset.dialect === 'string' ? { dialect: asset.dialect } : {}),
      adapters: stringList(asset.adapters, `assets[${index}].adapters`),
      ...(typeof asset.portable === 'boolean' ? { portable: asset.portable } : {}),
      access: asset.access === 'mutate' ? 'mutate' : 'read',
      approval: asset.approval === 'required' ? 'required' : 'none',
    }
  })
  if (new Set(parsedAssets.map(asset => asset.id)).size !== parsedAssets.length) throw new Error('asset ids must be unique')

  const slots = (source.resourceSlots ?? []) as unknown
  if (!Array.isArray(slots)) throw new Error('resourceSlots must be an array')
  const resourceSlots = slots.map((value, index): PackResourceSlot => {
    const slot = record(value, `resourceSlots[${index}]`)
    const slotId = text(slot.id, `resourceSlots[${index}].id`)
    if (!ID_PATTERN.test(slotId)) throw new Error(`invalid resource slot id ${JSON.stringify(slotId)}`)
    return {
      id: slotId,
      types: stringList(slot.types, `resourceSlots[${index}].types`),
      required: slot.required === true,
      description: text(slot.description, `resourceSlots[${index}].description`),
    }
  })
  if (new Set(resourceSlots.map(slot => slot.id)).size !== resourceSlots.length) throw new Error('resource slot ids must be unique')

  return {
    apiVersion: 'packs.hyperlake.cloud/v1alpha1',
    kind: 'SuperHarnessPack',
    metadata: {
      id,
      version,
      category,
      name: text(metadata.name, 'metadata.name'),
      description: text(metadata.description, 'metadata.description'),
    },
    requires,
    provides: stringList(source.provides, 'provides'),
    contributesTo: stringList(source.contributesTo, 'contributesTo'),
    resourceSlots,
    assets: parsedAssets,
  }
}

/** Read and validate `hyperlake-pack.yaml` from a pack package directory. */
export function loadPackDirectory(root: string): RegisteredPack {
  const canonicalRoot = realpathSync(resolve(root))
  const manifestPath = resolve(canonicalRoot, 'hyperlake-pack.yaml')
  const manifest = parsePackManifest(load(readFileSync(manifestPath, 'utf8')))
  for (const asset of manifest.assets ?? []) resolveAssetPath(canonicalRoot, asset)
  return { root: canonicalRoot, manifest }
}

function resolveAssetPath(root: string, asset: PackAsset): string {
  const candidate = resolve(root, asset.path)
  const lexical = relative(root, candidate)
  if (lexical === '..' || lexical.startsWith(`..${sep}`) || isAbsolute(lexical)) {
    throw new Error(`asset ${asset.id} escapes its pack root`)
  }
  const canonical = realpathSync(candidate)
  const actual = relative(root, canonical)
  if (actual === '..' || actual.startsWith(`..${sep}`) || isAbsolute(actual)) {
    throw new Error(`asset ${asset.id} resolves outside its pack root`)
  }
  if (!statSync(canonical).isFile()) throw new Error(`asset ${asset.id} is not a file`)
  return canonical
}

/** Registry for installed industry packs and their explicitly exported assets. */
export default class SuperHarnessPackRegistry extends TypertRemoteService {
  static inject = ['tools', 'agents', 'systemPrompt']
  static Config = Config

  private readonly packs = new Map<string, RegisteredPack>()
  private readonly defaults = new Map<string, boolean>()
  private readonly maxAssetBytes: number
  private readonly statePath: string
  private state: PersistedPackState

  constructor(ctx: Context, config: Config = {}) {
    super(ctx, 'hyperlakePacks')
    this.maxAssetBytes = config.maxAssetBytes ?? DEFAULT_MAX_ASSET_BYTES
    if (!Number.isSafeInteger(this.maxAssetBytes) || this.maxAssetBytes < 1) {
      throw new Error('maxAssetBytes must be a positive safe integer')
    }
    this.statePath = config.statePath?.trim() === '' || config.statePath === undefined
      ? dshHomePath('hyperlake-packs.json')
      : resolve(config.statePath)
    this.state = this.readState()
    ctx.effect(() => ctx.systemPrompt.section({
      name: 'superharness:selected-pack',
      order: 170,
      text: assembly => this.promptFor(assembly),
    }), 'hyperlake-packs.selected-prompt')
    ctx.effect(() => ctx.tools.register(this.listTool()), 'hyperlake-packs.list-tool')
    ctx.effect(() => ctx.tools.register(this.describeTool()), 'hyperlake-packs.describe-tool')
    ctx.effect(() => ctx.tools.register(this.validateTool()), 'hyperlake-packs.validate-tool')
    ctx.effect(() => ctx.tools.register(this.readAssetTool()), 'hyperlake-packs.read-asset-tool')
  }

  /** Register one validated pack for the calling plugin's effect lifetime. */
  register(pack: RegisteredPack, options: PackRegistrationOptions = {}): () => void {
    const id = pack.manifest.metadata.id
    if (this.packs.has(id)) throw new Error(`SuperHarness pack ${JSON.stringify(id)} is already registered`)
    this.packs.set(id, pack)
    this.defaults.set(id, options.defaultEnabled === true)
    return () => { this.packs.delete(id); this.defaults.delete(id) }
  }

  private readState(): PersistedPackState {
    try {
      const value = JSON.parse(readFileSync(this.statePath, 'utf8')) as unknown
      if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('state must be an object')
      const source = value as Record<string, unknown>
      const enabledSource = typeof source.enabled === 'object' && source.enabled !== null && !Array.isArray(source.enabled)
        ? source.enabled as Record<string, unknown> : {}
      const bindingsSource = typeof source.bindings === 'object' && source.bindings !== null && !Array.isArray(source.bindings)
        ? source.bindings as Record<string, unknown> : {}
      const enabled = Object.fromEntries(Object.entries(enabledSource).filter(([, item]) => typeof item === 'boolean')) as Record<string, boolean>
      const bindings: Record<string, PackResourceBinding[]> = {}
      for (const [packId, items] of Object.entries(bindingsSource)) {
        if (!Array.isArray(items)) continue
        const accepted = items.filter((item): item is PackResourceBinding => {
          if (typeof item !== 'object' || item === null || Array.isArray(item)) return false
          const binding = item as Record<string, unknown>
          return typeof binding.slotId === 'string' && binding.slotId.trim() !== ''
            && typeof binding.resourceType === 'string' && binding.resourceType.trim() !== ''
            && typeof binding.resourceId === 'string' && binding.resourceId.trim() !== ''
        }).map(item => ({ slotId: item.slotId.trim(), resourceType: item.resourceType.trim(), resourceId: item.resourceId.trim() }))
        bindings[packId] = accepted
      }
      return { enabled, bindings }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') this.ctx.logger.warn(`ignoring invalid pack state: ${String(error)}`)
      return { enabled: {}, bindings: {} }
    }
  }

  private persist(): void {
    mkdirSync(dirname(this.statePath), { recursive: true })
    const temporary = `${this.statePath}.${process.pid}.tmp`
    writeFileSync(temporary, `${JSON.stringify(this.state, null, 2)}\n`, { mode: 0o600 })
    renameSync(temporary, this.statePath)
  }

  private enabled(id: string): boolean {
    return this.state.enabled[id] ?? this.defaults.get(id) ?? false
  }

  /** Stable summaries for all registered packs. */
  list(): Array<{ id: string; version: string; category: PackCategory; name: string; description: string }> {
    return [...this.packs.values()]
      .map(({ manifest }) => ({
        id: manifest.metadata.id,
        version: manifest.metadata.version,
        category: manifest.metadata.category,
        name: manifest.metadata.name,
        description: manifest.metadata.description,
      }))
      .sort((left, right) => left.id.localeCompare(right.id))
  }

  /** Return one registered pack or fail with an actionable error. */
  get(id: string): RegisteredPack {
    const pack = this.packs.get(id)
    if (!pack) throw new Error(`SuperHarness pack ${JSON.stringify(id)} is not installed`)
    return pack
  }

  /** Check dependencies, adapter capabilities, and required resource bindings. */
  validate(id: string, bindings: PackResourceBinding[] = []): PackValidationResult {
    const pack = this.get(id)
    const issues: string[] = []
    const installed = [...this.packs.values()].filter(item => this.enabled(item.manifest.metadata.id)).map(item => item.manifest)
    const installedIds = new Set(installed.map(item => item.metadata.id))
    const installedAdapters = installed
      .filter(item => item.metadata.category === 'adapter')
      .map(item => item.metadata.id)
      .sort()
    const capabilities = new Set(installed.flatMap(item => item.provides ?? []))
    const bySlot = new Map<string, PackResourceBinding>()

    for (const binding of bindings) {
      if (binding.slotId.trim() === '' || binding.resourceType.trim() === '' || binding.resourceId.trim() === '') {
        issues.push('resource bindings require non-empty slotId, resourceType, and resourceId')
        continue
      }
      if (bySlot.has(binding.slotId)) issues.push(`resource slot ${JSON.stringify(binding.slotId)} is bound more than once`)
      bySlot.set(binding.slotId, binding)
    }
    for (const requiredPack of pack.manifest.requires?.packs ?? []) {
      if (!installedIds.has(requiredPack)) issues.push(`required pack ${JSON.stringify(requiredPack)} is not installed`)
    }
    for (const target of pack.manifest.contributesTo ?? []) {
      if (!this.packs.has(target)) issues.push(`contribution target ${JSON.stringify(target)} is not installed`)
      if (target === id) issues.push('a pack cannot contribute to itself')
    }
    for (const capability of pack.manifest.requires?.capabilities ?? []) {
      if (!capabilities.has(capability)) issues.push(`required capability ${JSON.stringify(capability)} is unavailable`)
    }
    const acceptedAdapters = pack.manifest.requires?.oneOfAdapters ?? []
    if (acceptedAdapters.length > 0 && !acceptedAdapters.some(adapter => installedIds.has(adapter))) {
      issues.push(`install one compatible adapter: ${acceptedAdapters.join(', ')}`)
    }
    const declaredSlots = new Map((pack.manifest.resourceSlots ?? []).map(slot => [slot.id, slot]))
    for (const binding of bindings) {
      if (!declaredSlots.has(binding.slotId)) issues.push(`resource slot ${JSON.stringify(binding.slotId)} is not declared by pack ${JSON.stringify(id)}`)
    }
    for (const slot of pack.manifest.resourceSlots ?? []) {
      const binding = bySlot.get(slot.id)
      if (slot.required && !binding) {
        issues.push(`required resource slot ${JSON.stringify(slot.id)} is not bound`)
      } else if (binding && !slot.types.includes(binding.resourceType)) {
        issues.push(`resource slot ${JSON.stringify(slot.id)} does not accept type ${JSON.stringify(binding.resourceType)}`)
      }
    }
    return { packId: id, valid: issues.length === 0, installedAdapters, bindings, issues }
  }

  private entry(id: string): PackCatalogEntry {
    const { manifest } = this.get(id)
    const bindings = this.state.bindings[id] ?? []
    const validation = this.validate(id, bindings)
    return {
      id, version: manifest.metadata.version, category: manifest.metadata.category,
      name: manifest.metadata.name, description: manifest.metadata.description,
      installed: true, enabled: this.enabled(id), ready: this.enabled(id) && validation.valid,
      contributesTo: manifest.contributesTo ?? [], provides: manifest.provides ?? [],
      requiresPacks: manifest.requires?.packs ?? [],
      requiresCapabilities: manifest.requires?.capabilities ?? [],
      acceptedAdapters: manifest.requires?.oneOfAdapters ?? [],
      resourceSlots: manifest.resourceSlots ?? [], bindings,
      assets: (manifest.assets ?? []).map(asset => ({
        id: asset.id, type: asset.type, description: asset.description,
        ...(asset.dialect === undefined ? {} : { dialect: asset.dialect }),
        ...(asset.portable === undefined ? {} : { portable: asset.portable }),
        access: asset.access ?? 'read', approval: asset.approval ?? 'none',
      })),
      issues: validation.issues,
    }
  }

  /** Complete lifecycle projection consumed by Web and other trusted clients. */
  @Remote('catalog')
  catalog(): PackCatalogSnapshot {
    return { entries: this.list().map(item => this.entry(item.id)) }
  }

  /** Enable or disable one installed, allowlisted pack. */
  @Remote('setEnabled')
  setEnabled(request: PackSetEnabledRequest): PackOperationResult {
    this.get(request.packId)
    this.state.enabled[request.packId] = request.enabled
    this.persist()
    return { ok: true, packId: request.packId, entry: this.entry(request.packId) }
  }

  /** Replace non-secret resource references for one pack. */
  @Remote('configure')
  configure(request: PackConfigureRequest): PackOperationResult {
    const bindings = request.bindings.map(binding => ({
      slotId: binding.slotId.trim(), resourceType: binding.resourceType.trim(), resourceId: binding.resourceId.trim(),
    }))
    const validation = this.validate(request.packId, bindings)
    const structural = validation.issues.filter(issue => !issue.startsWith('required pack ') && !issue.startsWith('required capability ') && !issue.startsWith('install one compatible adapter'))
    if (structural.some(issue => !issue.startsWith('required resource slot '))) {
      return { ok: false, packId: request.packId, message: structural.join('; ') }
    }
    this.state.bindings[request.packId] = bindings
    this.persist()
    return { ok: true, packId: request.packId, entry: this.entry(request.packId) }
  }

  /** Select a ready pack for a blank session and record immutable provenance. */
  @Remote('select')
  select(request: PackSelectRequest): PackSelectionResult {
    const pack = this.get(request.packId)
    const entry = this.entry(request.packId)
    if (!entry.enabled) return { ok: false, packId: request.packId, sessionId: request.sessionId, message: 'Enable this capability first.' }
    if (!entry.ready) return { ok: false, packId: request.packId, sessionId: request.sessionId, message: entry.issues.join('; ') }
    const agent = this.ctx.agents.get(request.sessionId as SessionId)
    if (agent === undefined) return { ok: false, packId: request.packId, sessionId: request.sessionId, message: 'The target session is not active.' }
    if (agent.session.events.some(event => event.type === 'turn/start')) {
      return { ok: false, packId: request.packId, sessionId: request.sessionId, message: 'Capabilities can only be selected before the first turn.' }
    }
    agent.session.append('superharness/pack-selected', {
      packId: request.packId,
      version: pack.manifest.metadata.version,
      bindings: entry.bindings.map(binding => ({ ...binding })),
    })
    return { ok: true, packId: request.packId, sessionId: request.sessionId, version: pack.manifest.metadata.version }
  }

  private promptFor(context: AssembleContext): string {
    const agent = context.scope as Agent | undefined
    if (agent?.session === undefined) return ''
    const selected = agent.session.events.findLast(event => event.type === 'superharness/pack-selected')
    if (selected?.type !== 'superharness/pack-selected') return ''
    const pack = this.packs.get(selected.data.packId)
    if (pack === undefined || pack.manifest.metadata.version !== selected.data.version) return ''
    const contributions = [...this.packs.values()]
      .filter(item => this.enabled(item.manifest.metadata.id) && item.manifest.contributesTo?.includes(selected.data.packId))
    const assets = [pack, ...contributions].flatMap(item => item.manifest.assets ?? [])
    const approval = assets.some(asset => asset.access === 'mutate' || asset.approval === 'required')
      ? 'Mutating actions require the platform approval flow before execution.' : ''
    return [
      `Active Hyperlake capability: ${pack.manifest.metadata.name} (${selected.data.packId}@${selected.data.version}).`,
      `Authorized resource bindings: ${JSON.stringify(selected.data.bindings)}.`,
      'Use only these bindings. Inspect exported routines, models, evaluations, and references before acting.',
      approval,
    ].filter(Boolean).join(' ')
  }

  private listTool() {
    return defineTool({
      name: 'superharness_pack_list',
      description: 'List installed Hyperlake industry and capability packs. Use this before selecting domain assets, routines, goals, or evaluations.',
      parameters: {},
      output: {
        schema: {
          type: 'array',
          items: {
            type: 'object', additionalProperties: false,
            properties: {
              id: { type: 'string', required: true }, version: { type: 'string', required: true },
              category: { type: 'string', required: true }, name: { type: 'string', required: true },
              description: { type: 'string', required: true },
            },
          },
        },
        render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
      },
      execute: () => Promise.resolve(this.list().filter(item => this.enabled(item.id))),
    })
  }

  private describeTool() {
    return defineTool({
      name: 'superharness_pack_describe',
      description: 'Describe one installed Hyperlake pack, including its requirements, resource slots, and exported asset catalog.',
      parameters: { pack_id: { type: 'string', required: true, description: 'Exact pack id returned by superharness_pack_list.' } },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      execute: (args) => {
        if (!this.enabled(args.pack_id)) throw new Error(`SuperHarness pack ${JSON.stringify(args.pack_id)} is disabled`)
        return Promise.resolve(JSON.stringify(this.get(args.pack_id).manifest, null, 2))
      },
    })
  }

  private validateTool() {
    return defineTool({
      name: 'superharness_pack_validate',
      description: 'Validate that an installed pack has its required packs, adapter capabilities, and concrete customer resource bindings before use.',
      parameters: {
        pack_id: { type: 'string', required: true, description: 'Exact installed pack id.' },
        bindings: {
          type: 'array',
          description: 'Customer resource selections for the pack resource slots.',
          items: {
            type: 'object', additionalProperties: false,
            properties: {
              slotId: { type: 'string', required: true },
              resourceType: { type: 'string', required: true },
              resourceId: { type: 'string', required: true },
            },
          },
        },
      },
      output: {
        schema: {
          type: 'object', additionalProperties: false,
          properties: {
            packId: { type: 'string', required: true }, valid: { type: 'boolean', required: true },
            installedAdapters: { type: 'array', required: true, items: { type: 'string' } },
            bindings: {
              type: 'array', required: true,
              items: {
                type: 'object', additionalProperties: false,
                properties: {
                  slotId: { type: 'string', required: true },
                  resourceType: { type: 'string', required: true },
                  resourceId: { type: 'string', required: true },
                },
              },
            },
            issues: { type: 'array', required: true, items: { type: 'string' } },
          },
        },
        render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
      },
      execute: args => Promise.resolve(this.validate(args.pack_id, args.bindings ?? [])),
    })
  }

  private readAssetTool() {
    return defineTool({
      name: 'superharness_pack_asset_read',
      description: 'Read one explicitly exported pack asset exactly as stored. Inspect the pack first and use this for DDL, SQL, dbt, notebook, semantic, dashboard, routine, goal, evaluation, or reference assets.',
      parameters: {
        pack_id: { type: 'string', required: true, description: 'Exact installed pack id.' },
        asset_id: { type: 'string', required: true, description: 'Exact asset id from the pack description.' },
      },
      output: {
        schema: {
          type: 'object', additionalProperties: false,
          properties: {
            packId: { type: 'string', required: true }, assetId: { type: 'string', required: true },
            type: { type: 'string', required: true }, description: { type: 'string', required: true },
            content: { type: 'string', required: true },
          },
        },
        render: (_args, value) => [{ type: 'text', text: value.content }],
      },
      execute: (args) => {
        if (!this.enabled(args.pack_id)) throw new Error(`SuperHarness pack ${JSON.stringify(args.pack_id)} is disabled`)
        const pack = this.get(args.pack_id)
        const asset = pack.manifest.assets?.find(candidate => candidate.id === args.asset_id)
        if (!asset) throw new Error(`asset ${JSON.stringify(args.asset_id)} is not exported by pack ${JSON.stringify(args.pack_id)}`)
        const path = resolveAssetPath(pack.root, asset)
        const size = statSync(path).size
        if (size > this.maxAssetBytes) throw new Error(`asset ${JSON.stringify(asset.id)} exceeds the ${this.maxAssetBytes}-byte read limit`)
        return Promise.resolve({
          packId: pack.manifest.metadata.id,
          assetId: asset.id,
          type: asset.type,
          description: asset.description,
          content: readFileSync(path, 'utf8'),
        })
      },
    })
  }
}

/** Register a pack directory for the lifetime of the calling pack plugin. */
export function registerPackDirectory(ctx: Context, root: string, options?: PackRegistrationOptions): () => void {
  return ctx.hyperlakePacks.register(loadPackDirectory(root), options)
}
