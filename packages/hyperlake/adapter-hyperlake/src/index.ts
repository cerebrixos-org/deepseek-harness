/** Hyperlake CLI MCP adapter pack registration. @module @cerebrixos/superharness-adapter-hyperlake */
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import { registerPackDirectory } from '@cerebrixos/superharness-packs'

/** Cordis plugin name. */
export const name = 'superharness-adapter-hyperlake'
/** Pack registry required by this adapter bundle. */
export const inject = ['hyperlakePacks']

/** Register adapter metadata for the lifetime of this bundle row. */
export function apply(ctx: Context): void {
  const root = fileURLToPath(new URL('../', import.meta.url))
  ctx.effect(() => registerPackDirectory(ctx, root), 'superharness-adapter-hyperlake.pack')
}
