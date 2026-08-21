import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it } from 'vitest'
import type { CapabilityProviderAttachment, PluginResourceProvider } from '@cerebrixos/superharness-packs'
import { apply } from '../src/index.ts'

const roots: string[] = []
const originalCommand = process.env.SUPERHARNESS_HYPERLAKE_COMMAND
const originalScript = process.env.SUPERHARNESS_HYPERLAKE_SCRIPT

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
  if (originalCommand === undefined) delete process.env.SUPERHARNESS_HYPERLAKE_COMMAND
  else process.env.SUPERHARNESS_HYPERLAKE_COMMAND = originalCommand
  if (originalScript === undefined) delete process.env.SUPERHARNESS_HYPERLAKE_SCRIPT
  else process.env.SUPERHARNESS_HYPERLAKE_SCRIPT = originalScript
})

describe('Hyperlake capability adapter', () => {
  it('registers first-party governed tools and supported resource providers', async () => {
    const root = mkdtempSync(join(tmpdir(), 'hyperlake-adapter-'))
    roots.push(root)
    const script = join(root, 'fixture.mjs')
    writeFileSync(script, 'process.stdout.write(JSON.stringify({ clusters: [{ id: "saas-1", name: "SaaS Production", status: "active" }] }))\n')
    process.env.SUPERHARNESS_HYPERLAKE_COMMAND = process.execPath
    process.env.SUPERHARNESS_HYPERLAKE_SCRIPT = script
    const providers: PluginResourceProvider[] = []
    const attachments: CapabilityProviderAttachment[] = []
    let tools = [{ name: 'mcp__hyperlake__query_run' }, { name: 'bash' }]
    let toolsChanged: (() => void) | undefined
    const ctx = {
      tools: { schemas: () => tools },
      hyperlakePacks: {
        register: () => () => {},
        registerResourceProvider: (provider: PluginResourceProvider) => { providers.push(provider); return () => {} },
        registerInstallationAttachment: (attachment: CapabilityProviderAttachment) => { attachments.push(attachment); return () => {} },
      },
      effect: (create: () => () => void) => create(),
      on: (event: string, listener: () => void, options?: { global?: boolean }) => {
        expect(options).toEqual({ global: true })
        if (event === 'tools/change') toolsChanged = listener
        return () => { toolsChanged = undefined }
      },
    } as unknown as Context

    apply(ctx)

    expect(providers.map(provider => provider.id)).toEqual([
      'hyperlake-clusters', 'hyperlake-saaslake', 'hyperlake-agents', 'hyperlake-semantic-models', 'hyperlake-services', 'hyperlake-monitors',
    ])
    expect(attachments).toContainEqual(expect.objectContaining({ id: 'hyperlake-governed-tools', scope: 'shared', toolNames: ['mcp__hyperlake__query_run'] }))
    const saas = providers.find(provider => provider.id === 'hyperlake-saaslake')
    await expect(saas?.list()).resolves.toEqual([expect.objectContaining({ id: 'saas-1', type: 'governed-data-environment' })])

    tools = []
    toolsChanged?.()
    expect(attachments).toHaveLength(1)
  })

  it('waits for asynchronous MCP tool discovery before advertising shared tools', () => {
    let tools: Array<{ name: string }> = []
    let toolsChanged: (() => void) | undefined
    const attachments: CapabilityProviderAttachment[] = []
    const ctx = {
      tools: { schemas: () => tools },
      hyperlakePacks: {
        register: () => () => {},
        registerResourceProvider: () => () => {},
        registerInstallationAttachment: (attachment: CapabilityProviderAttachment) => { attachments.push(attachment); return () => {} },
      },
      effect: (create: () => () => void) => create(),
      on: (_event: string, listener: () => void, options?: { global?: boolean }) => {
        expect(options).toEqual({ global: true })
        toolsChanged = listener
        return () => { toolsChanged = undefined }
      },
    } as unknown as Context

    apply(ctx)
    expect(attachments).toEqual([])
    tools = [{ name: 'mcp__hyperlake__clusters_list' }]
    toolsChanged?.()
    expect(attachments).toContainEqual(expect.objectContaining({ toolNames: ['mcp__hyperlake__clusters_list'] }))
  })

  it('surfaces CLI authentication failures instead of presenting an empty discovery result', async () => {
    const root = mkdtempSync(join(tmpdir(), 'hyperlake-adapter-auth-'))
    roots.push(root)
    const script = join(root, 'fixture.mjs')
    writeFileSync(script, 'process.stdout.write(JSON.stringify({ status: false, description: "Invalid access token" }))\n')
    process.env.SUPERHARNESS_HYPERLAKE_COMMAND = process.execPath
    process.env.SUPERHARNESS_HYPERLAKE_SCRIPT = script
    const providers: PluginResourceProvider[] = []
    const ctx = {
      tools: { schemas: () => [] },
      hyperlakePacks: {
        register: () => () => {},
        registerResourceProvider: (provider: PluginResourceProvider) => { providers.push(provider); return () => {} },
        registerInstallationAttachment: () => () => {},
      },
      effect: (create: () => () => void) => create(),
      on: (_event: string, _listener: () => void, options?: { global?: boolean }) => {
        expect(options).toEqual({ global: true })
        return () => {}
      },
    } as unknown as Context

    apply(ctx)
    await expect(providers.find(provider => provider.id === 'hyperlake-clusters')?.list()).rejects.toThrow('Invalid access token')
  })
})
