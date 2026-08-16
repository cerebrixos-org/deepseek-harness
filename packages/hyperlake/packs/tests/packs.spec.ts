import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import { CallId } from '@deepseek-ai/dsh-llm'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import { afterEach, describe, expect, it } from 'vitest'
import SuperHarnessPackRegistry, { loadPackDirectory } from '@cerebrixos/superharness-packs'

const roots: string[] = []
const signal = new AbortController().signal

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function fixture(assetPath = 'assets/model.sql'): string {
  const root = mkdtempSync(join(tmpdir(), 'superharness-pack-'))
  roots.push(root)
  mkdirSync(join(root, 'assets'))
  writeFileSync(join(root, 'assets/model.sql'), 'SELECT 1\n')
  writeFileSync(join(root, 'hyperlake-pack.yaml'), `
apiVersion: packs.hyperlake.cloud/v1alpha1
kind: SuperHarnessPack
metadata:
  id: data-engineering
  version: 1.0.0
  category: capability
  name: Data Engineering
  description: Governed data engineering procedures.
provides: [skills, assets, routines]
resourceSlots:
  - id: analytical-engine
    types: [hyperlake-cluster, databricks-workspace]
    required: true
    description: Engine that executes compatible data assets.
assets:
  - id: model
    type: sql
    path: ${assetPath}
    description: A deterministic model query.
    dialect: ansi-sql
    adapters: [hyperlake-trino, databricks]
    portable: true
`)
  return root
}

async function harness(agentFor: (id: string) => unknown = () => undefined) {
  const ctx = new Context()
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  ctx.provide('agents', { get: agentFor } as never)
  const stateRoot = mkdtempSync(join(tmpdir(), 'superharness-state-'))
  roots.push(stateRoot)
  await ctx.plugin(SuperHarnessPackRegistry, { statePath: join(stateRoot, 'packs.json') })
  return ctx
}

describe('SuperHarness pack registry', () => {
  it('registers one pack and exposes deterministic discovery and asset reads', async () => {
    const ctx = await harness()
    const dispose = ctx.hyperlakePacks.register(loadPackDirectory(fixture()), { defaultEnabled: true })

    expect(ctx.hyperlakePacks.list()).toEqual([{
      id: 'data-engineering', version: '1.0.0', category: 'capability',
      name: 'Data Engineering', description: 'Governed data engineering procedures.',
    }])
    const result = await ctx.tools.execute({
      signal, callId: CallId('read-1'), name: 'superharness_pack_asset_read',
      arguments: { pack_id: 'data-engineering', asset_id: 'model' },
    })
    expect(result.isError).toBe(false)
    expect(result.value).toMatchObject({ packId: 'data-engineering', assetId: 'model', content: 'SELECT 1\n' })

    dispose()
    expect(ctx.hyperlakePacks.list()).toEqual([])
  })

  it('rejects duplicate pack ids', async () => {
    const ctx = await harness()
    const first = loadPackDirectory(fixture())
    ctx.hyperlakePacks.register(first)
    expect(() => ctx.hyperlakePacks.register(first)).toThrow(/already registered/)
  })

  it('persists lifecycle configuration and scopes prompt context to the selected blank session', async () => {
    const session = Session.create(SessionId('session-pack'))
    const agent = { session }
    const ctx = await harness(id => id === 'session-pack' ? agent : undefined)
    ctx.hyperlakePacks.register(loadPackDirectory(fixture()), { defaultEnabled: true })

    expect(ctx.hyperlakePacks.configure({ packId: 'data-engineering', bindings: [{
      slotId: 'analytical-engine', resourceType: 'hyperlake-cluster', resourceId: 'cluster-123',
    }] })).toMatchObject({ ok: true, entry: { ready: true } })
    expect(ctx.hyperlakePacks.select({ sessionId: 'session-pack', packId: 'data-engineering' })).toMatchObject({
      ok: true, version: '1.0.0',
    })
    expect(session.events.at(-1)).toMatchObject({
      type: 'superharness/pack-selected',
      data: { packId: 'data-engineering', version: '1.0.0', bindings: [{ resourceId: 'cluster-123' }] },
    })
    const prompt = await ctx.systemPrompt.assemble({ scope: agent })
    expect(prompt.sections.find(section => section.name === 'superharness:selected-pack')?.text).toContain('cluster-123')
  })

  it('hides disabled pack assets from model-facing tools', async () => {
    const ctx = await harness()
    ctx.hyperlakePacks.register(loadPackDirectory(fixture()))
    const result = await ctx.tools.execute({
      signal, callId: CallId('read-disabled'), name: 'superharness_pack_asset_read',
      arguments: { pack_id: 'data-engineering', asset_id: 'model' },
    })
    expect(result.isError).toBe(true)
  })

  it('distinguishes an installed pack from a fully bound, runnable pack', async () => {
    const ctx = await harness()
    ctx.hyperlakePacks.register(loadPackDirectory(fixture()), { defaultEnabled: true })

    expect(ctx.hyperlakePacks.validate('data-engineering')).toMatchObject({
      valid: false,
      issues: ['required resource slot "analytical-engine" is not bound'],
    })
    expect(ctx.hyperlakePacks.validate('data-engineering', [{
      slotId: 'analytical-engine', resourceType: 'hyperlake-cluster', resourceId: 'cluster-123',
    }])).toMatchObject({ valid: true, issues: [] })
    expect(ctx.hyperlakePacks.validate('data-engineering', [{
      slotId: 'analytical-engine', resourceType: 'sharepoint-site', resourceId: 'site-123',
    }])).toMatchObject({
      valid: false,
      issues: ['resource slot "analytical-engine" does not accept type "sharepoint-site"'],
    })
  })

  it('composes the real solution, capability, and Hyperlake adapter manifests', async () => {
    const ctx = await harness()
    for (const directory of ['adapter-hyperlake', 'pack-data-engineering', 'solution-life-sciences']) {
      const root = fileURLToPath(new URL(`../../${directory}/`, import.meta.url))
      ctx.hyperlakePacks.register(loadPackDirectory(root), { defaultEnabled: true })
    }

    expect(ctx.hyperlakePacks.validate('data-engineering', [{
      slotId: 'data-environment', resourceType: 'hyperlake-query-resource', resourceId: 'cluster-123',
    }])).toMatchObject({ valid: true, installedAdapters: ['hyperlake'] })
    expect(ctx.hyperlakePacks.validate('life-sciences-research', [{
      slotId: 'clinical-data-environment', resourceType: 'hyperlake-query-resource', resourceId: 'cluster-123',
    }])).toMatchObject({ valid: true, issues: [] })
    expect(ctx.hyperlakePacks.get('life-sciences-research').manifest.assets?.[0]).toMatchObject({
      dialect: 'spark-sql', adapters: ['databricks'], portable: false,
    })
  })

  it('rejects lexical and symlink escapes from the pack root', () => {
    expect(() => loadPackDirectory(fixture('../outside.sql'))).toThrow(/escapes its pack root/)

    const root = fixture('assets/link.sql')
    const outside = mkdtempSync(join(tmpdir(), 'superharness-outside-'))
    roots.push(outside)
    writeFileSync(join(outside, 'secret.sql'), 'secret')
    symlinkSync(join(outside, 'secret.sql'), join(root, 'assets/link.sql'))
    expect(() => loadPackDirectory(root)).toThrow(/resolves outside its pack root/)
  })

  it('fails loud on malformed metadata and missing assets', () => {
    const malformed = fixture()
    writeFileSync(join(malformed, 'hyperlake-pack.yaml'), 'kind: Wrong\n')
    expect(() => loadPackDirectory(malformed)).toThrow(/unsupported pack apiVersion/)

    const missing = fixture('assets/missing.sql')
    expect(() => loadPackDirectory(missing)).toThrow()
  })
})
