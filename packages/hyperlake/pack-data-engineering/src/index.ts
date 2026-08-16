/** Data-engineering capability pack registration. @module @cerebrixos/superharness-pack-data-engineering */
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import { registerPackDirectory } from '@cerebrixos/superharness-packs'

/** Cordis plugin name. */
export const name = 'superharness-pack-data-engineering'
/** Services required by this pack. */
export const inject = ['hyperlakePacks']

/** Register pack metadata and concise capability-selection guidance. */
export function apply(ctx: Context): void {
  const root = fileURLToPath(new URL('../', import.meta.url))
  ctx.effect(() => registerPackDirectory(ctx, root, { defaultEnabled: true }), 'superharness-pack-data-engineering.pack')
}
