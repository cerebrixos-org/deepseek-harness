import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import { CallId } from '@deepseek-ai/dsh-llm'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import { afterEach, describe, expect, it } from 'vitest'
import SuperHarnessPackRegistry, { loadPackDirectory } from '@hyperlake/superharness-packs'

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

async function harness() {
  const ctx = new Context()
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(SuperHarnessPackRegistry)
  return ctx
}

describe('SuperHarness pack registry', () => {
  it('registers one pack and exposes deterministic discovery and asset reads', async () => {
    const ctx = await harness()
    const dispose = ctx.hyperlakePacks.register(loadPackDirectory(fixture()))

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

  it('distinguishes an installed pack from a fully bound, runnable pack', async () => {
    const ctx = await harness()
    ctx.hyperlakePacks.register(loadPackDirectory(fixture()))

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
      ctx.hyperlakePacks.register(loadPackDirectory(root))
    }

    expect(ctx.hyperlakePacks.validate('data-engineering', [{
      slotId: 'analytical-engine', resourceType: 'hyperlake-cluster', resourceId: 'cluster-123',
    }])).toMatchObject({ valid: true, installedAdapters: ['hyperlake'] })
    expect(ctx.hyperlakePacks.validate('life-sciences-research', [{
      slotId: 'clinical-analytical-engine', resourceType: 'hyperlake-cluster', resourceId: 'cluster-123',
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
