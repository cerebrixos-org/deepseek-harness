/** Package-owned invariant companion. @module @cerebrixos/superharness-ui-capability-library/invariant */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@cerebrixos/superharness-ui-capability-library'

/** Cordis companion plugin name. */
export const name = 'superharness-ui-capability-library-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

// No runtime invariant: this package owns a read-only Settings contribution.
const install: InvariantInstaller = () => {}

/** Register this package's invariant companion. */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
