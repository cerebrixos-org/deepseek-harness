/** Client-safe capability-pack lifecycle contracts. */

export type PackCategory = 'capability' | 'adapter' | 'domain' | 'asset' | 'governance' | 'solution'

export interface PackResourceBinding {
  slotId: string
  resourceType: string
  resourceId: string
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
  enabled: boolean
  ready: boolean
  contributesTo: string[]
  provides: string[]
  requiresPacks: string[]
  requiresCapabilities: string[]
  acceptedAdapters: string[]
  resourceSlots: PackResourceSlotView[]
  bindings: PackResourceBinding[]
  assets: PackAssetView[]
  issues: string[]
}

export interface PackCatalogSnapshot { entries: PackCatalogEntry[] }
export interface PackSetEnabledRequest { packId: string; enabled: boolean }
export interface PackConfigureRequest { packId: string; bindings: PackResourceBinding[] }
export interface PackSelectRequest { sessionId: string; packId: string }

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
