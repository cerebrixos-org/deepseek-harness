/** Data-engineering capability pack registration. @module @cerebrixos/superharness-pack-data-engineering */
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import { registerPackDirectory } from '@cerebrixos/superharness-packs'
import type {} from '@deepseek-ai/dsh-system-prompt'

/** Cordis plugin name. */
export const name = 'superharness-pack-data-engineering'
/** Services required by this pack. */
export const inject = ['hyperlakePacks', 'systemPrompt']

/** Register pack metadata and concise capability-selection guidance. */
export function apply(ctx: Context): void {
  const root = fileURLToPath(new URL('../', import.meta.url))
  ctx.effect(() => registerPackDirectory(ctx, root), 'superharness-pack-data-engineering.pack')
  ctx.effect(() => ctx.systemPrompt.section({
    name: 'superharness:pack:data-engineering',
    order: 170,
    text: 'For data-engineering work, use the Data Engineering capability as the operating context. Discover governed data and metadata first; use available lineage and observability when they help; treat dbt, repositories, and orchestrators as optional bound resources. Read relevant routines, DDL, goals, and evaluations before execution, and use only authorized resource bindings.',
  }), 'superharness-pack-data-engineering.prompt')
}
