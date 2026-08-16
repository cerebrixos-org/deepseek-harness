/** Package invariant companion for the Hyperlake MCP adapter. @module @hyperlake/superharness-adapter-hyperlake/invariant */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'
/** Cordis companion plugin name. */
export const name = 'superharness-adapter-hyperlake-invariant'
/** Required invariant registry. */
export const inject = ['invariants']
// No runtime invariant: MCP and pack services own the adapter's live relationships.
const install: InvariantInstaller = () => {}
/** Register the package-owned invariant companion. */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register('@hyperlake/superharness-adapter-hyperlake', install))
