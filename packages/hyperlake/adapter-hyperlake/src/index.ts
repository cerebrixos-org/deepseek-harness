/** Hyperlake CLI MCP adapter pack registration. @module @cerebrixos/superharness-adapter-hyperlake */
import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-tools'
import { registerPackDirectory } from '@cerebrixos/superharness-packs'
import type { PluginResourceView } from '@cerebrixos/superharness-packs/types'

/** Cordis plugin name. */
export const name = 'superharness-adapter-hyperlake'
/** Pack registry required by this adapter bundle. */
export const inject = ['hyperlakePacks', 'tools']

const execFileAsync = promisify(execFile)

function rows(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value.filter(item => typeof item === 'object' && item !== null) as Array<Record<string, unknown>>
  if (typeof value !== 'object' || value === null) return []
  const source = value as Record<string, unknown>
  for (const key of ['data', 'clusters', 'agents', 'semantic_models', 'models', 'services', 'monitors', 'items', 'results']) {
    const found = rows(source[key])
    if (found.length > 0) return found
  }
  return []
}

function scalar(value: unknown, fallback: string): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return fallback
}

async function discover(args: string[], type: string, providerId: string): Promise<PluginResourceView[]> {
  const command = process.env.SUPERHARNESS_HYPERLAKE_COMMAND || 'hyperlake'
  const prefix = process.env.SUPERHARNESS_HYPERLAKE_SCRIPT ? [process.env.SUPERHARNESS_HYPERLAKE_SCRIPT] : []
  const { stdout } = await execFileAsync(command, [...prefix, ...args, '--json'], { maxBuffer: 4 * 1024 * 1024 })
  const parsed = JSON.parse(stdout) as unknown
  if (typeof parsed === 'object' && parsed !== null) {
    const response = parsed as Record<string, unknown>
    if (response.status === false || response.status === 'error' || response.ok === false) {
      throw new Error(scalar(response.description ?? response.message ?? response.error, 'Hyperlake resource discovery failed'))
    }
  }
  return rows(parsed).flatMap((item) => {
    const idValue = item.id ?? item.uuid ?? item.cluster_id ?? item.agent_id
    if (typeof idValue !== 'string' || idValue.trim() === '') return []
    const nameValue = item.name ?? item.title ?? item.slug ?? idValue
    const name = scalar(nameValue, idValue)
    const descriptionValue = item.description ?? item.status
    return [{
      id: idValue,
      type,
      name,
      description: scalar(descriptionValue, `${type} ${name}`),
      providerId,
    }]
  })
}

/** Register adapter metadata for the lifetime of this bundle row. */
export function apply(ctx: Context): void {
  const root = fileURLToPath(new URL('../', import.meta.url))
  ctx.effect(() => registerPackDirectory(ctx, root, { defaultEnabled: true }), 'superharness-adapter-hyperlake.pack')
  ctx.effect(() => {
    let disposeAttachment: (() => void) | undefined
    let registeredNames = ''
    const synchronize = (): void => {
      const toolNames = ctx.tools.schemas().map(tool => tool.name).filter(tool => tool.startsWith('mcp__hyperlake__')).sort()
      const key = toolNames.join('\0')
      if (key === registeredNames) return
      disposeAttachment?.()
      disposeAttachment = undefined
      registeredNames = key
      if (toolNames.length > 0) {
        disposeAttachment = ctx.hyperlakePacks.registerInstallationAttachment({
          id: 'hyperlake-governed-tools', name: 'Hyperlake governed tools',
          description: 'First-party governed data, infrastructure, policy, observability, and workflow tools.',
          providerId: 'hyperlake', scope: 'shared', execution: 'local', outcomeIds: [], toolNames,
        })
      }
    }
    // MCP clients are sibling plugins, so their registrations can carry a
    // context filter that excludes ordinary listeners owned by this adapter.
    const stop = ctx.on('tools/change', synchronize, { global: true })
    synchronize()
    return () => { stop(); disposeAttachment?.() }
  }, 'superharness-adapter-hyperlake.tools')
  ctx.effect(() => ctx.hyperlakePacks.registerResourceProvider({
    id: 'hyperlake-clusters', pluginId: 'hyperlake', name: 'Hyperlake clusters',
    description: 'Clusters authorized for the authenticated Hyperlake user.',
    resourceTypes: ['hyperlake-query-resource', 'governed-data-environment', 'hyperlake-cluster'],
    list: () => discover(['clusters', 'list'], 'hyperlake-query-resource', 'hyperlake-clusters'),
  }), 'superharness-adapter-hyperlake.clusters')
  ctx.effect(() => ctx.hyperlakePacks.registerResourceProvider({
    id: 'hyperlake-saaslake', pluginId: 'hyperlake', name: 'SaaS Lake clusters',
    description: 'SaaS Lake clusters authorized for the authenticated Hyperlake user.',
    resourceTypes: ['saaslake-cluster', 'governed-data-environment'],
    list: () => discover(['saaslake', 'clusters', 'list'], 'governed-data-environment', 'hyperlake-saaslake'),
  }), 'superharness-adapter-hyperlake.saaslake')
  ctx.effect(() => ctx.hyperlakePacks.registerResourceProvider({
    id: 'hyperlake-agents', pluginId: 'hyperlake', name: 'Hyperlake agents',
    description: 'Agent manifests authorized for the authenticated Hyperlake user.',
    resourceTypes: ['hyperlake-agent'],
    list: () => discover(['agent', 'list'], 'hyperlake-agent', 'hyperlake-agents'),
  }), 'superharness-adapter-hyperlake.agents')
  ctx.effect(() => ctx.hyperlakePacks.registerResourceProvider({
    id: 'hyperlake-semantic-models', pluginId: 'hyperlake', name: 'Semantic model projects',
    description: 'Semantic model projects authorized for the authenticated Hyperlake user.',
    resourceTypes: ['semantic-model-project'],
    list: () => discover(['semantic-model', 'list'], 'semantic-model-project', 'hyperlake-semantic-models'),
  }), 'superharness-adapter-hyperlake.semantic-models')
  ctx.effect(() => ctx.hyperlakePacks.registerResourceProvider({
    id: 'hyperlake-services', pluginId: 'hyperlake', name: 'Governed services',
    description: 'Governed service definitions available through Hyperlake.',
    resourceTypes: ['governed-service'],
    list: () => discover(['service', 'list'], 'governed-service', 'hyperlake-services'),
  }), 'superharness-adapter-hyperlake.services')
  ctx.effect(() => ctx.hyperlakePacks.registerResourceProvider({
    id: 'hyperlake-monitors', pluginId: 'hyperlake', name: 'Monitors',
    description: 'Scheduled observability and policy-test monitors visible to the authenticated Hyperlake user.',
    resourceTypes: ['hyperlake-monitor'],
    list: () => discover(['monitor', 'list'], 'hyperlake-monitor', 'hyperlake-monitors'),
  }), 'superharness-adapter-hyperlake.monitors')
}
