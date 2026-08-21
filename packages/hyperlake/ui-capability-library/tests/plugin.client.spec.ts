import { describe, expect, it, vi } from 'vitest'
import { apply, inject } from '../src/client/index.ts'

describe('Capability Library client plugin', () => {
  it('uses the shared Remote assembly and registers its UI surfaces', async () => {
    const injectSlot = vi.fn()
    const ctx = {
      effect: vi.fn(),
      locale: { register: vi.fn(), bind: vi.fn(() => vi.fn((key: string) => key)) },
      remote: { hyperlakePacks: {} },
      slots: { inject: injectSlot, register: vi.fn() },
    }

    const cleanup = apply(ctx as never)

    expect(inject).toEqual(['slots', 'locale', 'remote'])
    expect(injectSlot).toHaveBeenCalledTimes(3)
    await cleanup()
  })
})
