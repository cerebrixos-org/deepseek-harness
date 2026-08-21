/** First-party Hyperlake Capability Library registered in Web Settings. */

import type {} from '@deepseek-ai/dsh-client-locale/client'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {
  CapabilityAssetAttachRequest, CapabilityAssetRemoveRequest, CapabilityAttachmentRemoveRequest,
  CapabilityAttachmentUpsertRequest, CapabilityCreateRequest, CapabilityDeleteRequest,
  CapabilityOutcomesSetRequest, CapabilityResourceRemoveRequest, CapabilityResourceUpsertRequest,
  PackConfigureRequest, PackSelectRequest, PackSelectionRequest, PackSetEnabledRequest, PluginInstallRequest,
  PluginRemoveRequest, PluginResourceDiscoverRequest,
} from '@cerebrixos/superharness-packs/types'
import hyperlakePacksRemote from '@cerebrixos/superharness-packs/remote'
import { CapabilityChooser, CapabilityHome, CapabilityLibrary, PluginCatalog, type CapabilityLibraryInjected } from './CapabilityLibrary.tsx'
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
export const inject = ['slots', 'locale', 'remote']

/** Register the lazy Capability Library tab. */
export async function apply(ctx: ClientContext): Promise<() => Promise<void>> {
  const disposeRemote = await ctx.remote.$mount(hyperlakePacksRemote)
  const uiFiber = ctx.inject(['remote.hyperlakePacks'], (scope: ClientContext) => {
    const packs = scope.remote.hyperlakePacks
    scope.effect(() => scope.locale.register(NS, { zh, en }), 'superharness-capability-library: dictionaries')
    const t = scope.locale.bind(NS)
    const unwrap = async <T>(request: Promise<{ ok: true; value: T } | { ok: false; error: { code: string } }>): Promise<T> => {
      const result = await request
      if (!result.ok) throw new Error(`hyperlakePacks request failed: ${result.error.code}`)
      return result.value
    }
    const injected: CapabilityLibraryInjected = {
      catalog: () => unwrap(packs.catalog()),
      setEnabled: (request: PackSetEnabledRequest) => unwrap(packs.setEnabled(request)),
      configure: (request: PackConfigureRequest) => unwrap(packs.configure(request)),
      select: (request: PackSelectRequest) => unwrap(packs.select(request)),
      selection: (request: PackSelectionRequest) => unwrap(packs.selection(request)),
      createCapability: (request: CapabilityCreateRequest) => unwrap(packs.createCapability(request)),
      deleteCapability: (request: CapabilityDeleteRequest) => unwrap(packs.deleteCapability(request)),
      upsertAttachment: (request: CapabilityAttachmentUpsertRequest) => unwrap(packs.upsertAttachment(request)),
      removeAttachment: (request: CapabilityAttachmentRemoveRequest) => unwrap(packs.removeAttachment(request)),
      setOutcomes: (request: CapabilityOutcomesSetRequest) => unwrap(packs.setOutcomes(request)),
      attachAsset: (request: CapabilityAssetAttachRequest) => unwrap(packs.attachAsset(request)),
      removeAsset: (request: CapabilityAssetRemoveRequest) => unwrap(packs.removeAsset(request)),
      upsertResource: (request: CapabilityResourceUpsertRequest) => unwrap(packs.upsertResource(request)),
      removeResource: (request: CapabilityResourceRemoveRequest) => unwrap(packs.removeResource(request)),
      discoverResources: (request: PluginResourceDiscoverRequest) => unwrap(packs.discoverResources(request)),
      installPlugin: (request: PluginInstallRequest) => unwrap(packs.installPlugin(request)),
      removePlugin: (request: PluginRemoveRequest) => unwrap(packs.removePlugin(request)),
    }
    scope.slots.inject('settings.section', () => scope.slots.register({
      name: 'settings.section', id: 'capabilities', order: -100, label: () => t('tab'), locale: NS,
      inject: (): CapabilityLibraryInjected => injected,
    }, CapabilityLibrary))
    scope.slots.inject('conversation.hero.capabilities', () => scope.slots.register({
      name: 'conversation.hero.capabilities', id: 'hyperlake-capability-packs', order: 10, locale: NS,
      inject: (): CapabilityLibraryInjected => injected,
    }, CapabilityHome))
    scope.slots.inject('conversation.input.left', () => scope.slots.register({
      name: 'conversation.input.left', id: 'hyperlake-capability', order: 20, locale: NS,
      inject: (): CapabilityLibraryInjected => injected,
    }, CapabilityChooser))
    scope.slots.inject('settings.plugins.tab', () => scope.slots.register({
      name: 'settings.plugins.tab', id: 'hyperlake-contributions', order: -100, label: () => t('tab'), locale: NS,
      inject: (): CapabilityLibraryInjected => injected,
    }, PluginCatalog))
  })
  try {
    await uiFiber
  } catch (error) {
    await disposeRemote()
    throw error
  }
  return async () => {
    await uiFiber.dispose()
    await disposeRemote()
  }
}
