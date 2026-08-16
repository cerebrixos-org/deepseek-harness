/** First-party Hyperlake Capability Library registered in Web Settings. */

import type {} from '@deepseek-ai/dsh-client-locale/client'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { CapabilityHome, CapabilityLibrary, type CapabilityLibraryInjected } from './CapabilityLibrary.tsx'
import { en, zh, type CapabilityLibraryLocaleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** First-party Hyperlake Capability Library copy. */
    'settings.capabilityLibrary': CapabilityLibraryLocaleKey
  }
}

/** Dictionary namespace owned by this plugin. */
export const NS = 'settings.capabilityLibrary'
/** Services required by the Settings contribution and inventory Remote. */
export const inject = ['slots', 'locale', 'remote', 'remote.pluginInventory']

/** Register the lazy Capability Library tab. */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'superharness-capability-library: dictionaries')
  const t = ctx.locale.bind(NS)
  const list: CapabilityLibraryInjected['list'] = async () => {
    const result = await ctx.remote.pluginInventory.list()
    if (!result.ok) throw new Error(`pluginInventory.list failed: ${result.error.code}`)
    return result.value
  }
  ctx.slots.inject('settings.plugins.tab', () => ctx.slots.register({
    name: 'settings.plugins.tab',
    id: 'capabilities',
    order: 5,
    label: () => t('tab'),
    locale: NS,
    inject: (): CapabilityLibraryInjected => ({ list }),
  }, CapabilityLibrary))
  ctx.slots.inject('conversation.hero.capabilities', () => ctx.slots.register({
    name: 'conversation.hero.capabilities',
    id: 'hyperlake-capability-packs',
    order: 10,
    locale: NS,
    inject: (): CapabilityLibraryInjected => ({ list }),
  }, CapabilityHome))
}
