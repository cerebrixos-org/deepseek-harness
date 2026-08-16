// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CapabilityLibrary, type CapabilityLibraryInjected, type CapabilityLibraryProps } from '../src/client/CapabilityLibrary.tsx'
import { en, type CapabilityLibraryLocaleKey } from '../src/client/locales.ts'

afterEach(cleanup)

type Snapshot = Awaited<ReturnType<CapabilityLibraryInjected['list']>>
const t = (key: CapabilityLibraryLocaleKey): string => en[key]

function props(list: CapabilityLibraryInjected['list']): CapabilityLibraryProps {
  return { t, list } as unknown as CapabilityLibraryProps
}

const SNAPSHOT = {
  entries: [
    {
      entryId: 'data-engineering', moduleName: '@hyperlake/superharness-pack-data-engineering',
      enabled: true, fiberPhase: 'active',
    },
    {
      entryId: 'hyperlake', moduleName: '@hyperlake/superharness-adapter-hyperlake',
      enabled: true, fiberPhase: 'active',
    },
  ],
} as unknown as Snapshot

describe('CapabilityLibrary', () => {
  it('shows outcomes first and implementation providers only through resource status', async () => {
    render(<CapabilityLibrary {...props(async () => SNAPSHOT)} />)

    const capability = await screen.findByRole('button', { name: /Data Engineering/ })
    expect(capability.textContent).toContain('Enabled')
    expect(screen.getByText('Governed data access')).toBeTruthy()
    expect(screen.getByText('Metadata and lineage')).toBeTruthy()
    expect(screen.getByText('Logs and metrics')).toBeTruthy()
    expect(screen.getAllByText('Available')).toHaveLength(3)
    expect(screen.getAllByText(/Supported/)).toHaveLength(2)
    expect(screen.queryByText('Trino')).toBeNull()
    expect(screen.queryByText('dbt')).toBeNull()
  })

  it('distinguishes an available solution from an enabled capability', async () => {
    render(<CapabilityLibrary {...props(async () => SNAPSHOT)} />)
    const solution = await screen.findByRole('button', { name: /Life Sciences Research/ })
    expect(solution.textContent).toContain('Not enabled')
    fireEvent.click(solution)
    expect(screen.getByText('Clinical data environment')).toBeTruthy()
  })

  it('contains inventory failures and retries', async () => {
    const list = vi.fn<CapabilityLibraryInjected['list']>()
      .mockRejectedValueOnce(new Error('private transport detail'))
      .mockResolvedValueOnce(SNAPSHOT)
    render(<CapabilityLibrary {...props(list)} />)
    expect((await screen.findByRole('alert')).textContent).toBe(en.error)
    expect(screen.queryByText('private transport detail')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: en.retry }))
    expect(await screen.findByRole('button', { name: /Data Engineering/ })).toBeTruthy()
    expect(list).toHaveBeenCalledTimes(2)
  })

  it('ignores a completed inventory read after unmount', async () => {
    const deferred = Promise.withResolvers<Snapshot>()
    const view = render(<CapabilityLibrary {...props(() => deferred.promise)} />)
    view.unmount()
    await act(async () => { deferred.resolve(SNAPSHOT) })
  })
})
