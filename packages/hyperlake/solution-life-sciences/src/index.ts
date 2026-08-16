/** Life-sciences solution-pack registration. @module @cerebrixos/superharness-solution-life-sciences */
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import { registerPackDirectory } from '@cerebrixos/superharness-packs'

/** Cordis plugin name. */
export const name = 'superharness-solution-life-sciences'
/** Services required by this solution pack. */
export const inject = ['hyperlakePacks']
/** Register accelerator assets and domain selection guidance. */
export function apply(ctx: Context): void {
  const root = fileURLToPath(new URL('../', import.meta.url))
  ctx.effect(() => registerPackDirectory(ctx, root), 'superharness-solution-life-sciences.pack')
}
