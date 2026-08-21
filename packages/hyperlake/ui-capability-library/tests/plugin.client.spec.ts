import { describe, expect, it, vi } from 'vitest'
import { apply, inject } from '../src/client/index.ts'

describe('Capability Library client plugin', () => {
  it('mounts its owned Remote contribution and registers its UI surfaces', async () => {
    const injectSlot = vi.fn()
    const disposeRemote = vi.fn(async () => {})
    const mount = vi.fn(async () => disposeRemote)
    const ctx = {
      effect: vi.fn(),
      locale: { register: vi.fn(), bind: vi.fn(() => vi.fn((key: string) => key)) },
      remote: { $mount: mount, hyperlakePacks: {} },
      slots: { inject: injectSlot, register: vi.fn() },
    }

    const cleanup = await apply(ctx as never)

    expect(inject).toEqual(['slots', 'locale', 'remote'])
    expect(mount).toHaveBeenCalledOnce()
    expect(injectSlot).toHaveBeenCalledTimes(3)
    await cleanup()
    expect(disposeRemote).toHaveBeenCalledOnce()
  })
})
