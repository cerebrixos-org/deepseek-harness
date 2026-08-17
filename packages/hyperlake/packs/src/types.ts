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

/** Client-safe metadata for one explicitly exported pack asset. */
export interface PackAssetView {
  id: string
  type: string
  description: string
  dialect?: string
  portable?: boolean
  access: 'read' | 'mutate'
  approval: 'none' | 'required'
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
  assets: PackAssetView[]
  issues: string[]
}

/** Current client-safe capability registry snapshot. */
export interface PackCatalogSnapshot {
  entries: PackCatalogEntry[]
  availableTools: CapabilityToolView[]
  attachments: CapabilityProviderAttachment[]
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
/** Request to delete one user-owned capability. */
export interface CapabilityDeleteRequest { packId: string }
/** Request to create or replace one provider attachment. */
export interface CapabilityAttachmentUpsertRequest { attachment: CapabilityProviderAttachment }
/** Request to remove one provider attachment. */
export interface CapabilityAttachmentRemoveRequest { attachmentId: string }

/** Shared mutation result returned by pack lifecycle operations. */
export interface PackOperationResult {
  ok: boolean
  packId: string
  message?: string
  entry?: PackCatalogEntry
}

/** Pack-selection result with target session provenance. */
export interface PackSelectionResult extends PackOperationResult {
  sessionId: string
  version?: string
}
