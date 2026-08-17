/** Hyperlake CLI MCP adapter pack registration. @module @cerebrixos/superharness-adapter-hyperlake */
import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import type { Context } from '@deepseek-ai/cordis'
import { registerPackDirectory } from '@cerebrixos/superharness-packs'
import type { PluginResourceView } from '@cerebrixos/superharness-packs/types'

/** Cordis plugin name. */
export const name = 'superharness-adapter-hyperlake'
/** Pack registry required by this adapter bundle. */
export const inject = ['hyperlakePacks']

const execFileAsync = promisify(execFile)

function rows(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value.filter(item => typeof item === 'object' && item !== null) as Array<Record<string, unknown>>
  if (typeof value !== 'object' || value === null) return []
  const source = value as Record<string, unknown>
  for (const key of ['data', 'clusters', 'agents', 'items', 'results']) {
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
    list: () => discover(['saaslake', 'clusters', 'list'], 'saaslake-cluster', 'hyperlake-saaslake'),
  }), 'superharness-adapter-hyperlake.saaslake')
  ctx.effect(() => ctx.hyperlakePacks.registerResourceProvider({
    id: 'hyperlake-agents', pluginId: 'hyperlake', name: 'Hyperlake agents',
    description: 'Agent manifests authorized for the authenticated Hyperlake user.',
    resourceTypes: ['hyperlake-agent'],
    list: () => discover(['agent', 'list'], 'hyperlake-agent', 'hyperlake-agents'),
  }), 'superharness-adapter-hyperlake.agents')
}
