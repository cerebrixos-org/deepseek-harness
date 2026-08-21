// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PackCatalogSnapshot } from '@cerebrixos/superharness-packs/types'
import {
  CapabilityChooser, CapabilityHome, CapabilityLibrary, PluginCatalog, type CapabilityChooserProps, type CapabilityHomeProps,
  type CapabilityLibraryInjected, type CapabilityLibraryProps,
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
    selection: vi.fn().mockResolvedValue({ sessionId: 'session-1', selected: false }),
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

  it('shows only a safe typed RPC failure code', async () => {
    const catalog = vi.fn().mockRejectedValue(new Error('hyperlakePacks request failed: method-not-found'))
    render(<CapabilityLibrary {...props({ catalog })} />)
    expect((await screen.findByRole('alert')).textContent).toContain('(method-not-found)')
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

  it('discovers, attaches, and binds a compatible resource in one setup action', async () => {
    const setupSnapshot: PackCatalogSnapshot = {
      ...SNAPSHOT,
      resourceProviders: [{ id: 'hyperlake-clusters', pluginId: 'hyperlake', name: 'Hyperlake clusters', description: 'Authorized clusters.', resourceTypes: ['governed-data-environment'] }],
      entries: SNAPSHOT.entries.map(entry => entry.id === 'data-engineering' ? { ...entry, ready: false, bindings: [], resources: [], issues: ['required resource slot "data-environment" is not bound'] } : entry),
    }
    const upsertResource = vi.fn<CapabilityLibraryInjected['upsertResource']>().mockResolvedValue({ ok: true, packId: 'data-engineering' })
    const configure = vi.fn<CapabilityLibraryInjected['configure']>().mockResolvedValue({ ok: true, packId: 'data-engineering' })
    const discoverResources = vi.fn<CapabilityLibraryInjected['discoverResources']>().mockResolvedValue([{ id: 'cluster-1', type: 'governed-data-environment', name: 'Production', description: 'Production cluster.', providerId: 'hyperlake-clusters' }])
    render(<CapabilityLibrary {...props({
      catalog: vi.fn().mockResolvedValue(setupSnapshot), upsertResource, configure, discoverResources,
    })} />)
    await screen.findByRole('button', { name: /Data Engineering/ })
    fireEvent.click(screen.getByRole('tab', { name: 'Resources' }))
    const slot = screen.getByRole('group', { name: /data-environment/ })
    fireEvent.click(within(slot).getByRole('button', { name: 'Discover authorized resources' }))
    await within(slot).findByRole('option', { name: 'Production' })
    fireEvent.change(within(slot).getByLabelText('Resource'), { target: { value: 'cluster-1' } })
    fireEvent.click(within(slot).getByRole('button', { name: 'Use this resource' }))
    await waitFor(() => {
      expect(configure).toHaveBeenCalledWith({
        packId: 'data-engineering',
        bindings: [{ slotId: 'data-environment', resourceType: 'governed-data-environment', resourceId: 'cluster-1' }],
      })
    })
    expect(upsertResource.mock.calls[0]?.[0].resource.providerId).toBe('hyperlake-clusters')
    expect(upsertResource.mock.calls[0]?.[0].resource.resourceId).toBe('cluster-1')
  })

  it('turns a contained provider failure into actionable discovery guidance', async () => {
    const setupSnapshot: PackCatalogSnapshot = {
      ...SNAPSHOT,
      resourceProviders: [{ id: 'hyperlake-clusters', pluginId: 'hyperlake', name: 'Hyperlake clusters', description: 'Authorized clusters.', resourceTypes: ['governed-data-environment'] }],
    }
    const discoverResources = vi.fn<CapabilityLibraryInjected['discoverResources']>()
      .mockRejectedValue(new Error('hyperlakePacks request failed: internal'))
    render(<CapabilityLibrary {...props({ catalog: vi.fn().mockResolvedValue(setupSnapshot), discoverResources })} />)
    await screen.findByRole('button', { name: /Data Engineering/ })
    fireEvent.click(screen.getByRole('tab', { name: 'Resources' }))
    const slot = screen.getByRole('group', { name: /data-environment/ })
    fireEvent.click(within(slot).getByRole('button', { name: 'Discover authorized resources' }))
    expect((await within(slot).findByRole('alert')).textContent).toBe(en.resourceDiscoveryFailed)
    expect(within(slot).queryByText('hyperlakePacks request failed: internal')).toBeNull()
  })

  it('selects one ready capability outcome from the conversation composer', async () => {
    const select = vi.fn<CapabilityLibraryInjected['select']>().mockResolvedValue({ ok: true, packId: 'data-engineering', sessionId: 'session-1', version: '1.0.0', outcomeId: 'data-modeling' })
    const chooser = {
      ...props({ select }),
      session: { sessionId: 'session-1', blank: true },
    } as unknown as CapabilityChooserProps
    render(<CapabilityChooser {...chooser} />)
    const control = await screen.findByLabelText('Capability')
    fireEvent.change(control, { target: { value: 'data-engineering::data-modeling' } })
    await waitFor(() => {
      expect(select).toHaveBeenCalledWith({ sessionId: 'session-1', packId: 'data-engineering', outcomeId: 'data-modeling' })
    })
    expect(await screen.findByText('Active for this conversation')).toBeTruthy()
    expect((control as HTMLSelectElement).disabled).toBe(true)
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
