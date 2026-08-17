/** First-party Hyperlake Capability Library registered in Web Settings. */

import type {} from '@deepseek-ai/dsh-client-locale/client'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {
  CapabilityAttachmentRemoveRequest, CapabilityAttachmentUpsertRequest, CapabilityCreateRequest,
  CapabilityDeleteRequest, PackConfigureRequest, PackSelectRequest, PackSetEnabledRequest,
} from '@cerebrixos/superharness-packs/types'
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
export const inject = ['slots', 'locale', 'remote', 'remote.hyperlakePacks']

/** Register the lazy Capability Library tab. */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'superharness-capability-library: dictionaries')
  const t = ctx.locale.bind(NS)
  const unwrap = async <T>(request: Promise<{ ok: true; value: T } | { ok: false; error: { code: string } }>): Promise<T> => {
    const result = await request
    if (!result.ok) throw new Error(`hyperlakePacks request failed: ${result.error.code}`)
    return result.value
  }
  const injected: CapabilityLibraryInjected = {
    catalog: () => unwrap(ctx.remote.hyperlakePacks.catalog()),
    setEnabled: (request: PackSetEnabledRequest) => unwrap(ctx.remote.hyperlakePacks.setEnabled(request)),
    configure: (request: PackConfigureRequest) => unwrap(ctx.remote.hyperlakePacks.configure(request)),
    select: (request: PackSelectRequest) => unwrap(ctx.remote.hyperlakePacks.select(request)),
    createCapability: (request: CapabilityCreateRequest) => unwrap(ctx.remote.hyperlakePacks.createCapability(request)),
    deleteCapability: (request: CapabilityDeleteRequest) => unwrap(ctx.remote.hyperlakePacks.deleteCapability(request)),
    upsertAttachment: (request: CapabilityAttachmentUpsertRequest) => unwrap(ctx.remote.hyperlakePacks.upsertAttachment(request)),
    removeAttachment: (request: CapabilityAttachmentRemoveRequest) => unwrap(ctx.remote.hyperlakePacks.removeAttachment(request)),
  }
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'capabilities',
    order: -100,
    label: () => t('tab'),
    locale: NS,
    inject: (): CapabilityLibraryInjected => injected,
  }, CapabilityLibrary))
  ctx.slots.inject('conversation.hero.capabilities', () => ctx.slots.register({
    name: 'conversation.hero.capabilities',
    id: 'hyperlake-capability-packs',
    order: 10,
    locale: NS,
    inject: (): CapabilityLibraryInjected => injected,
  }, CapabilityHome))
}
