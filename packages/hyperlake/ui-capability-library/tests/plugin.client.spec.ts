import { describe, expect, it, vi } from 'vitest'
import hyperlakePacksRemote from '@cerebrixos/superharness-packs/remote'
import { apply, inject } from '../src/client/index.ts'

describe('Capability Library client plugin', () => {
  it('mounts its published Remote contribution before registering UI surfaces', async () => {
    const dispose = vi.fn(async () => {})
    const mount = vi.fn(async () => dispose)
    const injectSlot = vi.fn()
    const ctx = {
      effect: vi.fn(),
      locale: { register: vi.fn(), bind: vi.fn(() => vi.fn((key: string) => key)) },
      remote: { $mount: mount, hyperlakePacks: {} },
      slots: { inject: injectSlot, register: vi.fn() },
    }

    const cleanup = await apply(ctx as never)

    expect(inject).toEqual(['slots', 'locale', 'remote'])
    expect(mount).toHaveBeenCalledWith(hyperlakePacksRemote)
    expect(injectSlot).toHaveBeenCalledTimes(3)
    await cleanup()
    expect(dispose).toHaveBeenCalledOnce()
  })
})
