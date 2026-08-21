// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PackCatalogSnapshot } from '@cerebrixos/superharness-packs/types'
import {
  CapabilityHome, CapabilityLibrary, PluginCatalog, type CapabilityHomeProps, type CapabilityLibraryInjected, type CapabilityLibraryProps,
} from '../src/client/CapabilityLibrary.tsx'
import { en } from '../src/client/locales.ts'

afterEach(cleanup)
const messages: Readonly<Record<string, string>> = en
const t: CapabilityLibraryProps['t'] = key => messages[key] ?? key

const SNAPSHOT: PackCatalogSnapshot = {
  availableTools: [{ name: 'query_data', description: 'Query governed data.', core: false }],
  coreTools: [{ name: 'bash', description: 'Core shell.', core: true }], attachments: [], resourceProviders: [], installedPlugins: [], entries: [
    {
      id: 'data-engineering', version: '1.0.0', category: 'capability', name: 'Data Engineering',
      description: 'Governed data engineering.', installed: true, userCreated: false, enabled: true, ready: true,
      contributesTo: [], provides: ['data-modeling'], requiresPacks: [], requiresCapabilities: [], acceptedAdapters: [],
      outcomes: [{ id: 'data-modeling', name: 'Model governed data', description: 'Create an authorized model.' }], effectiveAttachments: [], effectiveTools: [],
      resourceSlots: [{ id: 'data-environment', types: ['governed-data-environment'], required: true, description: 'Authorized data environment.' }],
      bindings: [{ slotId: 'data-environment', resourceType: 'governed-data-environment', resourceId: 'resource-1' }],
      resources: [{ id: 'resource-1', name: 'Production', description: 'Production data.', providerId: 'hyperlake-clusters', resourceType: 'governed-data-environment', resourceId: 'resource-1' }],
      assets: [{ id: 'build-silver', type: 'routine', description: 'Build a silver model.', access: 'mutate', approval: 'required', sourcePackId: 'data-engineering', sourceAssetId: 'build-silver', attached: false }], issues: [],
    },
    {
      id: 'life-sciences-research', version: '1.0.0', category: 'solution', name: 'Life Sciences Research',
      description: 'Clinical research accelerator.', installed: true, userCreated: false, enabled: false, ready: false,
      contributesTo: ['data-engineering'], provides: ['clinical-analysis'], requiresPacks: ['data-engineering'], requiresCapabilities: [], acceptedAdapters: [],
      outcomes: [{ id: 'clinical-analysis', name: 'Analyze studies', description: 'Analyze permitted study data.' }], effectiveAttachments: [], effectiveTools: [],
      resourceSlots: [], bindings: [], resources: [], assets: [], issues: [],
    },
  ] }

function props(overrides: Partial<CapabilityLibraryInjected> = {}): CapabilityLibraryProps {
  const injected: CapabilityLibraryInjected = {
    catalog: vi.fn().mockResolvedValue(SNAPSHOT),
    setEnabled: vi.fn().mockResolvedValue({ ok: true, packId: 'life-sciences-research' }),
    configure: vi.fn().mockResolvedValue({ ok: true, packId: 'data-engineering' }),
    select: vi.fn().mockResolvedValue({ ok: true, packId: 'data-engineering', sessionId: 'session-1' }),
    createCapability: vi.fn().mockResolvedValue({ ok: true, packId: 'custom' }),
    deleteCapability: vi.fn().mockResolvedValue({ ok: true, packId: 'custom' }),
    upsertAttachment: vi.fn().mockResolvedValue({ ok: true, packId: 'data-engineering' }),
    removeAttachment: vi.fn().mockResolvedValue({ ok: true, packId: 'data-engineering' }),
    setOutcomes: vi.fn().mockResolvedValue({ ok: true, packId: 'data-engineering' }),
    attachAsset: vi.fn().mockResolvedValue({ ok: true, packId: 'data-engineering' }),
    removeAsset: vi.fn().mockResolvedValue({ ok: true, packId: 'data-engineering' }),
    upsertResource: vi.fn().mockResolvedValue({ ok: true, packId: 'data-engineering' }),
    removeResource: vi.fn().mockResolvedValue({ ok: true, packId: 'data-engineering' }),
    discoverResources: vi.fn().mockResolvedValue([]),
    installPlugin: vi.fn().mockResolvedValue({ ok: true, message: 'installed', restartRequired: true }),
    removePlugin: vi.fn().mockResolvedValue({ ok: true, message: 'removed', restartRequired: true }),
    ...overrides,
  }
  return {
    t, ...injected,
    useSessions: (selector: (value: unknown) => unknown) => selector({ current: 'session-1', ids: ['session-1'], byId: { 'session-1': { id: 'session-1', blank: true } }, phase: 'ready', subagentsByParent: {}, jobsBySession: {}, currentAddress: undefined }),
  } as unknown as CapabilityLibraryProps
}

describe('CapabilityLibrary', () => {
  it('shows readiness, lifecycle actions, details, and approval metadata', async () => {
    render(<CapabilityLibrary {...props()} />)
    expect(await screen.findByRole('button', { name: /Data Engineering/ })).toBeTruthy()
    expect(screen.getByText('Ready')).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'Workflows' }))
    expect(screen.getByText('build-silver')).toBeTruthy()
    expect(screen.getByText('Approval required')).toBeTruthy()
  })

  it('enables a shipped solution through the typed lifecycle remote', async () => {
    const setEnabled = vi.fn().mockResolvedValue({ ok: true, packId: 'life-sciences-research' })
    render(<CapabilityLibrary {...props({ setEnabled })} />)
    await screen.findByText('Life Sciences Research')
    fireEvent.click(screen.getByRole('button', { name: 'Enable' }))
    expect(setEnabled).toHaveBeenCalledWith({ packId: 'life-sciences-research', enabled: true })
  })

  it('selects a ready pack for the current blank conversation', async () => {
    const select = vi.fn().mockResolvedValue({ ok: true, packId: 'data-engineering', sessionId: 'session-1' })
    render(<CapabilityLibrary {...props({ select })} />)
    await screen.findByRole('button', { name: /Data Engineering/ })
    fireEvent.click(screen.getAllByRole('button', { name: 'Use' })[0]!)
    expect(select).toHaveBeenCalledWith({ sessionId: 'session-1', packId: 'data-engineering', outcomeId: 'data-modeling' })
  })

  it('shows packs compactly on the new-session home', async () => {
    render(<CapabilityHome {...props() as unknown as CapabilityHomeProps} />)
    expect(await screen.findByText('Capability packs')).toBeTruthy()
    expect(document.querySelector('[data-surface="home"]')).toBeTruthy()
  })

  it('contains catalog failures and retries', async () => {
    const catalog = vi.fn().mockRejectedValueOnce(new Error('private detail')).mockResolvedValueOnce(SNAPSHOT)
    render(<CapabilityLibrary {...props({ catalog })} />)
    expect((await screen.findByRole('alert')).textContent).toBe(en.error)
    expect(screen.queryByText('private detail')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: en.retry }))
    expect(await screen.findByRole('button', { name: /Data Engineering/ })).toBeTruthy()
  })

  it('creates a capability with explicit outcomes', async () => {
    const createCapability = vi.fn().mockResolvedValue({ ok: true, packId: 'risk-review' })
    render(<CapabilityLibrary {...props({ createCapability })} />)
    await screen.findByRole('button', { name: /Data Engineering/ })
    fireEvent.click(screen.getByRole('button', { name: 'New capability' }))
    const creator = screen.getByRole('heading', { name: 'New capability' }).closest('section')!
    fireEvent.change(within(creator).getByLabelText('Name'), { target: { value: 'Risk Review' } })
    fireEvent.change(within(creator).getByLabelText('Description'), { target: { value: 'Review governed risk decisions.' } })
    fireEvent.change(within(creator).getByLabelText('First outcome'), { target: { value: 'Approved review' } })
    fireEvent.change(within(creator).getByLabelText('Outcome description'), { target: { value: 'Produce a verified risk review' } })
    fireEvent.click(within(creator).getByRole('button', { name: 'Create' }))
    expect(createCapability).toHaveBeenCalledWith(expect.objectContaining({
      id: 'risk-review', outcomes: [expect.objectContaining({ id: 'approved-review', name: 'Approved review', description: 'Produce a verified risk review' })],
    }))
  })

  it('attaches installed tools to a capability provider', async () => {
    const upsertAttachment = vi.fn<CapabilityLibraryInjected['upsertAttachment']>()
      .mockResolvedValue({ ok: true, packId: 'data-engineering' })
    render(<CapabilityLibrary {...props({ upsertAttachment })} />)
    await screen.findByRole('button', { name: /Data Engineering/ })
    fireEvent.click(screen.getByRole('tab', { name: 'Tools' }))
    const editor = screen.getByRole('heading', { name: 'Add capability tool' }).parentElement!
    fireEvent.change(within(editor).getByLabelText('Name'), { target: { value: 'Governed query' } })
    const tools = within(editor).getByLabelText('Tools')
    const option = within(tools).getByRole('option', { name: /query_data/ }) as HTMLOptionElement
    option.selected = true
    fireEvent.change(tools)
    fireEvent.click(within(editor).getByRole('button', { name: 'Attach' }))
    expect(upsertAttachment).toHaveBeenCalledTimes(1)
    const request = upsertAttachment.mock.calls.at(0)?.[0]
    expect(request?.attachment).toMatchObject({
      scope: 'capability', capabilityId: 'data-engineering', name: 'Governed query', toolNames: ['query_data'],
    })
  })

  it('installs a confirmed npm or Git plugin through the profile lifecycle', async () => {
    const installPlugin = vi.fn<CapabilityLibraryInjected['installPlugin']>()
      .mockResolvedValue({ ok: true, message: 'restart required', restartRequired: true, packageName: '@example/plugin' })
    render(<PluginCatalog {...props({ installPlugin })} t={t} />)
    await screen.findByRole('heading', { name: 'Install plugin' })
    fireEvent.change(screen.getByLabelText(/npm, GitHub/), { target: { value: 'github:example/plugin#abc123' } })
    fireEvent.click(screen.getByLabelText(/modify my local Hyperlake profile/))
    fireEvent.click(screen.getByRole('button', { name: 'Install' }))
    expect(installPlugin).toHaveBeenCalledWith({ source: 'github:example/plugin#abc123', confirmed: true })
    expect(await screen.findByText('restart required')).toBeTruthy()
  })
})
