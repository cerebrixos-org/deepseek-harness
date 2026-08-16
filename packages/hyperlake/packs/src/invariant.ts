/**
 * Package invariant companion for the SuperHarness pack registry.
 * @module @cerebrixos/superharness-packs/invariant
 */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

/** Cordis companion plugin name. */
export const name = 'superharness-packs-invariant'
/** Service required before the companion can register. */
export const inject = ['invariants']

// No runtime invariant: validation is synchronous at the untrusted input boundary.
const install: InvariantInstaller = () => {}

/**
 * Install no global invariant. Pack validation occurs synchronously at the
 * untrusted YAML and filesystem registration boundary, and unit tests cover
 * the registry relationships without inspecting private service state.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register('@cerebrixos/superharness-packs', install))
