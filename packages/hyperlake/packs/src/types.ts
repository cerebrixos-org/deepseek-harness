/** Client-safe capability-pack lifecycle contracts. */

export type PackCategory = 'capability' | 'adapter' | 'domain' | 'asset' | 'governance' | 'solution'

export interface PackResourceBinding {
  slotId: string
  resourceType: string
  resourceId: string
}

export interface CapabilityOutcome {
  id: string
  name: string
  description: string
}

export interface CapabilityToolView {
  name: string
  description: string
}

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

export interface PackAssetView {
  id: string
  type: string
  description: string
  dialect?: string
  portable?: boolean
  access: 'read' | 'mutate'
  approval: 'none' | 'required'
}

export interface PackResourceSlotView {
  id: string
  types: string[]
  required: boolean
  description: string
}

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

export interface PackCatalogSnapshot {
  entries: PackCatalogEntry[]
  availableTools: CapabilityToolView[]
  attachments: CapabilityProviderAttachment[]
}
export interface PackSetEnabledRequest { packId: string; enabled: boolean }
export interface PackConfigureRequest { packId: string; bindings: PackResourceBinding[] }
export interface PackSelectRequest { sessionId: string; packId: string }
export interface CapabilityCreateRequest {
  id: string
  name: string
  description: string
  outcomes: CapabilityOutcome[]
}
export interface CapabilityDeleteRequest { packId: string }
export interface CapabilityAttachmentUpsertRequest { attachment: CapabilityProviderAttachment }
export interface CapabilityAttachmentRemoveRequest { attachmentId: string }

export interface PackOperationResult {
  ok: boolean
  packId: string
  message?: string
  entry?: PackCatalogEntry
}

export interface PackSelectionResult extends PackOperationResult {
  sessionId: string
  version?: string
}
