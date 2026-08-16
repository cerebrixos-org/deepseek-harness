/** Package invariant companion for the life-sciences solution. @module @hyperlake/superharness-solution-life-sciences/invariant */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'
/** Cordis companion plugin name. */
export const name = 'superharness-solution-life-sciences-invariant'
/** Required invariant registry. */
export const inject = ['invariants']
// No runtime invariant: the shared registry validates this static pack at load.
const install: InvariantInstaller = () => {}
/** Register the package-owned invariant companion. */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register('@hyperlake/superharness-solution-life-sciences', install))
