// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PackCatalogSnapshot } from '@cerebrixos/superharness-packs/types'
import { CapabilityHome, CapabilityLibrary, type CapabilityLibraryInjected, type CapabilityLibraryProps } from '../src/client/CapabilityLibrary.tsx'
import { en, type CapabilityLibraryLocaleKey } from '../src/client/locales.ts'

afterEach(cleanup)
const t = (key: CapabilityLibraryLocaleKey): string => en[key]

const SNAPSHOT: PackCatalogSnapshot = { entries: [
  {
    id: 'data-engineering', version: '1.0.0', category: 'capability', name: 'Data Engineering',
    description: 'Governed data engineering.', installed: true, enabled: true, ready: true,
    contributesTo: [], provides: ['data-modeling'], requiresPacks: [], requiresCapabilities: [], acceptedAdapters: [],
    resourceSlots: [{ id: 'data-environment', types: ['governed-data-environment'], required: true, description: 'Authorized data environment.' }],
    bindings: [{ slotId: 'data-environment', resourceType: 'governed-data-environment', resourceId: 'resource-1' }],
    assets: [{ id: 'build-silver', type: 'routine', description: 'Build a silver model.', access: 'mutate', approval: 'required' }], issues: [],
  },
  {
    id: 'life-sciences-research', version: '1.0.0', category: 'solution', name: 'Life Sciences Research',
    description: 'Clinical research accelerator.', installed: true, enabled: false, ready: false,
    contributesTo: ['data-engineering'], provides: ['clinical-analysis'], requiresPacks: ['data-engineering'], requiresCapabilities: [], acceptedAdapters: [],
    resourceSlots: [], bindings: [], assets: [], issues: [],
  },
] }

function props(overrides: Partial<CapabilityLibraryInjected> = {}): CapabilityLibraryProps {
  const injected: CapabilityLibraryInjected = {
    catalog: vi.fn().mockResolvedValue(SNAPSHOT),
    setEnabled: vi.fn().mockResolvedValue({ ok: true, packId: 'life-sciences-research' }),
    configure: vi.fn().mockResolvedValue({ ok: true, packId: 'data-engineering' }),
    select: vi.fn().mockResolvedValue({ ok: true, packId: 'data-engineering', sessionId: 'session-1' }),
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
    expect(await screen.findByText('Data Engineering')).toBeTruthy()
    expect(screen.getByText('Ready')).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'Assets' }))
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
    await screen.findByText('Data Engineering')
    fireEvent.click(screen.getAllByRole('button', { name: 'Use' })[0]!)
    expect(select).toHaveBeenCalledWith({ sessionId: 'session-1', packId: 'data-engineering' })
  })

  it('shows packs compactly on the new-session home', async () => {
    render(<CapabilityHome {...props()} />)
    expect(await screen.findByText('Capability packs')).toBeTruthy()
    expect(document.querySelector('[data-surface="home"]')).toBeTruthy()
  })

  it('contains catalog failures and retries', async () => {
    const catalog = vi.fn().mockRejectedValueOnce(new Error('private detail')).mockResolvedValueOnce(SNAPSHOT)
    render(<CapabilityLibrary {...props({ catalog })} />)
    expect((await screen.findByRole('alert')).textContent).toBe(en.error)
    expect(screen.queryByText('private detail')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: en.retry }))
    expect(await screen.findByText('Data Engineering')).toBeTruthy()
  })
})
