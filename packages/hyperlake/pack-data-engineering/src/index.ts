/** Data-engineering capability pack registration. @module @hyperlake/superharness-pack-data-engineering */
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import { registerPackDirectory } from '@hyperlake/superharness-packs'
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
    text: 'For data-engineering work, inspect installed SuperHarness packs before inventing schemas or procedures. Read the relevant routine, DDL, goal, and evaluation assets; execute them only through a compatible installed adapter and bound customer resource.',
  }), 'superharness-pack-data-engineering.prompt')
}
