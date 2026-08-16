/** Package invariant companion for the Hyperlake SuperHarness bundle. @module @hyperlake/superharness-base/invariant */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

/** Cordis companion plugin name. */
export const name = 'superharness-base-invariant'
/** Required invariant registry. */
export const inject = ['invariants']
// No runtime invariant: this package is a static composition bundle.
const install: InvariantInstaller = () => {}
/** Register the package-owned invariant companion. */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register('@hyperlake/superharness-base', install))
