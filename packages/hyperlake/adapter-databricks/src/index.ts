/** Customer-configured Databricks MCP adapter registration. @module @cerebrixos/superharness-adapter-databricks */
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import { registerPackDirectory } from '@cerebrixos/superharness-packs'

/** Cordis plugin name. */
export const name = 'superharness-adapter-databricks'
/** Pack registry required by this adapter bundle. */
export const inject = ['hyperlakePacks']
/** Register adapter metadata independently from customer credentials. */
export function apply(ctx: Context): void {
  const root = fileURLToPath(new URL('../', import.meta.url))
  ctx.effect(() => registerPackDirectory(ctx, root), 'superharness-adapter-databricks.pack')
}
