/** Client-safe capability-pack lifecycle contracts. */

export type PackCategory = 'capability' | 'adapter' | 'domain' | 'asset' | 'governance' | 'solution'

/** Opaque customer-resource reference bound to one declared pack slot. */
export interface PackResourceBinding {
  slotId: string
  resourceType: string
  resourceId: string
}

/** User-facing outcome that a capability promises to support. */
export interface CapabilityOutcome {
  id: string
  name: string
  description: string
}

/** Client-safe summary of one tool available for attachment. */
export interface CapabilityToolView {
  name: string
  description: string
  core: boolean
}

/** Provider and tool set attached globally or to one capability. */
export interface CapabilityProviderAttachment {
  id: string
  name: string
  description: string
  providerId: string
  scope: 'shared' | 'capability'
  capabilityId?: string
  execution: 'local' | 'platform'
  outcomeIds: string[]
  toolNames: string[]
}

/** Immutable asset selected from an installed source plugin. */
export interface CapabilityAssetAttachment {
  id: string
  sourcePackId: string
  sourceAssetId: string
}

/** One resource instance discovered by an installed resource-provider plugin. */
export interface CapabilityResourceAttachment {
  id: string
  name: string
  description: string
  providerId: string
  resourceType: string
  resourceId: string
}

/** Client-safe resource-provider contribution. */
export interface PluginResourceProviderView {
  id: string
  pluginId: string
  name: string
  description: string
  resourceTypes: string[]
}

/** Client-safe resource returned by a provider discovery operation. */
export interface PluginResourceView {
  id: string
  type: string
  name: string
  description: string
  providerId: string
}

/** One profile dependency managed through the same pnpm lifecycle as the CLI. */
export interface InstalledPluginView {
  packageName: string
  version: string
  source: string
  description: string
  bundle: boolean
  restartRequired: boolean
}

/** Client-safe metadata for one explicitly exported pack asset. */
export interface PackAssetView {
  id: string
  type: string
  description: string
  dialect?: string
  portable?: boolean
  access: 'read' | 'mutate'
  approval: 'none' | 'required'
  sourcePackId: string
  sourceAssetId: string
  attached: boolean
}

/** Typed resource requirement declared by a pack. */
export interface PackResourceSlotView {
  id: string
  types: string[]
  required: boolean
  description: string
}

/** Complete lifecycle and readiness projection for one pack. */
export interface PackCatalogEntry {
  id: string
  version: string
  category: PackCategory
  name: string
  description: string
  installed: boolean
  userCreated: boolean
  enabled: boolean
  ready: boolean
  contributesTo: string[]
  provides: string[]
  outcomes: CapabilityOutcome[]
  effectiveAttachments: CapabilityProviderAttachment[]
  effectiveTools: string[]
  requiresPacks: string[]
  requiresCapabilities: string[]
  acceptedAdapters: string[]
  resourceSlots: PackResourceSlotView[]
  bindings: PackResourceBinding[]
  resources: CapabilityResourceAttachment[]
  assets: PackAssetView[]
  issues: string[]
}

/** Current client-safe capability registry snapshot. */
export interface PackCatalogSnapshot {
  entries: PackCatalogEntry[]
  availableTools: CapabilityToolView[]
  coreTools: CapabilityToolView[]
  attachments: CapabilityProviderAttachment[]
  resourceProviders: PluginResourceProviderView[]
  installedPlugins: InstalledPluginView[]
}
/** Request to change one installed pack's lifecycle state. */
export interface PackSetEnabledRequest { packId: string; enabled: boolean }
/** Request to replace one pack's non-secret resource bindings. */
export interface PackConfigureRequest { packId: string; bindings: PackResourceBinding[] }
/** Request to select one ready pack before a session's first turn. */
export interface PackSelectRequest { sessionId: string; packId: string }
/** Request to create a user-owned capability and its outcomes. */
export interface CapabilityCreateRequest {
  id: string
  name: string
  description: string
  outcomes: CapabilityOutcome[]
}
/** Replace a capability's complete outcome set. */
export interface CapabilityOutcomesSetRequest { packId: string; outcomes: CapabilityOutcome[] }
/** Request to delete one user-owned capability. */
export interface CapabilityDeleteRequest { packId: string }
/** Request to create or replace one provider attachment. */
export interface CapabilityAttachmentUpsertRequest { attachment: CapabilityProviderAttachment }
/** Request to remove one provider attachment. */
export interface CapabilityAttachmentRemoveRequest { attachmentId: string }
/** Attach or remove an immutable asset exported by an installed plugin. */
export interface CapabilityAssetAttachRequest { packId: string; sourcePackId: string; sourceAssetId: string }
export interface CapabilityAssetRemoveRequest { packId: string; attachmentId: string }
/** Attach or remove a discovered non-secret resource reference. */
export interface CapabilityResourceUpsertRequest { packId: string; resource: CapabilityResourceAttachment }
export interface CapabilityResourceRemoveRequest { packId: string; resourceId: string }
/** Discover resources through one installed provider plugin. */
export interface PluginResourceDiscoverRequest { providerId: string }
/** Install or remove a profile plugin using existing npm/SSH credentials. */
export interface PluginInstallRequest { source: string; confirmed: boolean }
export interface PluginRemoveRequest { packageName: string; confirmed: boolean }

/** Shared mutation result returned by pack lifecycle operations. */
export interface PackOperationResult {
  ok: boolean
  packId: string
  message?: string
  entry?: PackCatalogEntry
}

export interface PluginOperationResult {
  ok: boolean
  message: string
  restartRequired: boolean
  packageName?: string
}

/** Pack-selection result with target session provenance. */
export interface PackSelectionResult extends PackOperationResult {
  sessionId: string
  version?: string
}
