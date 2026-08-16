/** First-party outcome catalog rendered independently from implementation brands. */

export interface CapabilityResource {
  id: string
  label: string
  relationship: 'provisioned' | 'enabled' | 'connected'
  providerModule?: string
  optional?: boolean
}

export interface FirstPartyCapability {
  id: string
  name: string
  category: 'capability' | 'solution'
  description: string
  moduleName: string
  resources: CapabilityResource[]
}

/** Curated capabilities shipped or supported by this SuperHarness release. */
export const FIRST_PARTY_CAPABILITIES: readonly FirstPartyCapability[] = [
  {
    id: 'data-engineering',
    name: 'Data Engineering',
    category: 'capability',
    description: 'Governed discovery, modeling, transformation, quality, lineage, observability, and delivery.',
    moduleName: '@cerebrixos/superharness-pack-data-engineering',
    resources: [
      {
        id: 'governed-data-access',
        label: 'Governed data access',
        relationship: 'provisioned',
        providerModule: '@cerebrixos/superharness-adapter-hyperlake',
      },
      {
        id: 'metadata-lineage',
        label: 'Metadata and lineage',
        relationship: 'enabled',
        providerModule: '@cerebrixos/superharness-adapter-hyperlake',
      },
      {
        id: 'observability',
        label: 'Logs and metrics',
        relationship: 'enabled',
        providerModule: '@cerebrixos/superharness-adapter-hyperlake',
      },
      {
        id: 'transformation-project',
        label: 'Transformation project',
        relationship: 'connected',
        optional: true,
      },
      {
        id: 'orchestration',
        label: 'Workflow orchestration',
        relationship: 'connected',
        optional: true,
      },
    ],
  },
  {
    id: 'life-sciences-research',
    name: 'Life Sciences Research',
    category: 'solution',
    description: 'Governed clinical-research models, procedures, provenance checks, and output evaluations.',
    moduleName: '@cerebrixos/superharness-solution-life-sciences',
    resources: [
      {
        id: 'data-engineering',
        label: 'Data Engineering',
        relationship: 'enabled',
        providerModule: '@cerebrixos/superharness-pack-data-engineering',
      },
      {
        id: 'clinical-data-environment',
        label: 'Clinical data environment',
        relationship: 'connected',
      },
    ],
  },
] as const
