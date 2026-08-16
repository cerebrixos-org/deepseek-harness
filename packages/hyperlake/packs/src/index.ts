/**
 * Portable Hyperlake SuperHarness industry-pack registry and model-facing
 * asset catalog.
 * @module @cerebrixos/superharness-packs
 */

import { readFileSync, realpathSync, statSync } from 'node:fs'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { Context, Service } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { load } from 'js-yaml'
import { defineTool } from '@deepseek-ai/dsh-tools'

/** Categories describe composition intent without creating incompatible formats. */
export type PackCategory = 'capability' | 'adapter' | 'domain' | 'asset' | 'governance' | 'solution'

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
  resourceSlots?: PackResourceSlot[]
  assets?: PackAsset[]
}

/** A validated pack and its canonical filesystem location. */
export interface RegisteredPack {
  readonly root: string
  readonly manifest: Readonly<PackManifest>
}

/** A concrete customer resource selected for one logical pack slot. */
export interface PackResourceBinding {
  slotId: string
  resourceType: string
  resourceId: string
}

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
})

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
export default class SuperHarnessPackRegistry extends Service {
  static inject = ['tools']
  static Config = Config

  private readonly packs = new Map<string, RegisteredPack>()
  private readonly maxAssetBytes: number

  constructor(ctx: Context, config: Config = {}) {
    super(ctx, 'hyperlakePacks')
    this.maxAssetBytes = config.maxAssetBytes ?? DEFAULT_MAX_ASSET_BYTES
    if (!Number.isSafeInteger(this.maxAssetBytes) || this.maxAssetBytes < 1) {
      throw new Error('maxAssetBytes must be a positive safe integer')
    }
    ctx.effect(() => ctx.tools.register(this.listTool()), 'hyperlake-packs.list-tool')
    ctx.effect(() => ctx.tools.register(this.describeTool()), 'hyperlake-packs.describe-tool')
    ctx.effect(() => ctx.tools.register(this.validateTool()), 'hyperlake-packs.validate-tool')
    ctx.effect(() => ctx.tools.register(this.readAssetTool()), 'hyperlake-packs.read-asset-tool')
  }

  /** Register one validated pack for the calling plugin's effect lifetime. */
  register(pack: RegisteredPack): () => void {
    const id = pack.manifest.metadata.id
    if (this.packs.has(id)) throw new Error(`SuperHarness pack ${JSON.stringify(id)} is already registered`)
    this.packs.set(id, pack)
    return () => { this.packs.delete(id) }
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
    const installed = [...this.packs.values()].map(item => item.manifest)
    const installedIds = new Set(installed.map(item => item.metadata.id))
    const installedAdapters = installed
      .filter(item => item.metadata.category === 'adapter')
      .map(item => item.metadata.id)
      .sort()
    const capabilities = new Set(installed.flatMap(item => item.provides ?? []))
    const bySlot = new Map<string, PackResourceBinding>()

    for (const binding of bindings) {
      if (bySlot.has(binding.slotId)) issues.push(`resource slot ${JSON.stringify(binding.slotId)} is bound more than once`)
      bySlot.set(binding.slotId, binding)
    }
    for (const requiredPack of pack.manifest.requires?.packs ?? []) {
      if (!installedIds.has(requiredPack)) issues.push(`required pack ${JSON.stringify(requiredPack)} is not installed`)
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
      execute: () => Promise.resolve(this.list()),
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
      execute: args => Promise.resolve(JSON.stringify(this.get(args.pack_id).manifest, null, 2)),
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
export function registerPackDirectory(ctx: Context, root: string): () => void {
  return ctx.hyperlakePacks.register(loadPackDirectory(root))
}
