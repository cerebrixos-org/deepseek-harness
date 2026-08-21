import { describe, expect, it, vi } from 'vitest'
import { apply, inject } from '../src/client/index.ts'
import type { CapabilityLibraryInjected } from '../src/client/CapabilityLibrary.tsx'

describe('Capability Library client plugin', () => {
  it('mounts its owned Remote contribution and registers its UI surfaces', async () => {
    const injectSlot = vi.fn()
    const disposeRemote = vi.fn(async () => {})
    const disposeFiber = vi.fn(async () => {})
    const mount = vi.fn(async () => disposeRemote)
    const ctx: Record<string, unknown> = {
      effect: vi.fn(),
      locale: { register: vi.fn(), bind: vi.fn(() => vi.fn((key: string) => key)) },
      remote: { $mount: mount, hyperlakePacks: {} },
      slots: { inject: injectSlot, register: vi.fn() },
    }
    ctx.inject = vi.fn((_deps: readonly string[], callback: (scope: typeof ctx) => void) => {
      callback(ctx)
      return Object.assign(Promise.resolve(), { dispose: disposeFiber })
    })

    const cleanup = await apply(ctx as never)

    expect(inject).toEqual(['slots', 'locale', 'remote'])
    expect(mount).toHaveBeenCalledOnce()
    expect(injectSlot).toHaveBeenCalledTimes(4)
    await cleanup()
    expect(disposeFiber).toHaveBeenCalledOnce()
    expect(disposeRemote).toHaveBeenCalledOnce()
  })

  it('captures the mounted namespace before UI callbacks leave the injected context', async () => {
    const catalog = vi.fn().mockResolvedValue({ ok: true, value: { entries: [] } })
    const namespace = { catalog }
    let injected = false
    const remote = { $mount: vi.fn(async () => vi.fn()) } as Record<string, unknown>
    Object.defineProperty(remote, 'hyperlakePacks', {
      get: () => {
        if (!injected) throw new Error('late remote namespace lookup')
        return namespace
      },
    })
    const register = vi.fn((_registration: { inject: () => CapabilityLibraryInjected }): void => undefined)
    const injectSlot = vi.fn((_name: string, _register: () => void): void => undefined)
    const ctx: Record<string, unknown> = {
      effect: vi.fn(),
      locale: { register: vi.fn(), bind: vi.fn(() => vi.fn((key: string) => key)) },
      remote,
      slots: { inject: injectSlot, register },
    }
    ctx.inject = vi.fn((_deps: readonly string[], callback: (scope: typeof ctx) => void) => {
      injected = true
      callback(ctx)
      injected = false
      return Object.assign(Promise.resolve(), { dispose: vi.fn(async () => {}) })
    })

    await apply(ctx as never)
    injectSlot.mock.calls[0]![1]()
    const capability = register.mock.calls[0]![0].inject()

    await expect(capability.catalog()).resolves.toEqual({ entries: [] })
    expect(catalog).toHaveBeenCalledOnce()
  })
})
