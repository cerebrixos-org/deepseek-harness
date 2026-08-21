import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import { createScope, type Scope } from '@deepseek-ai/dsh-scope'
import { CallId } from '@deepseek-ai/dsh-llm'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime, { defineTool } from '@deepseek-ai/dsh-tools'
import type { Agent } from '@deepseek-ai/dsh-agent'
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
  writeFileSync(join(root, 'assets/goal.yaml'), `
apiVersion: goals.hyperlake.cloud/v1alpha1
kind: Goal
metadata:
  id: freshness
spec:
  successCriteria:
    - metric: freshness_minutes
      operator: less_than
      value: 30
  observe:
    capability: data.query
    resourceSlot: analytical-engine
  allowedRoutines: [build-model]
`)
  writeFileSync(join(root, 'assets/routine.yaml'), `
apiVersion: routines.hyperlake.cloud/v1alpha1
kind: Routine
metadata:
  id: build-model
spec:
  steps:
    - action: catalog.inspect
      resourceSlot: analytical-engine
    - action: model.apply
      resourceSlot: analytical-engine
      approval: required
    - verify: data-quality.verify
  limits:
    maxAttempts: 2
`)
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
  - id: freshness
    type: goal
    path: assets/goal.yaml
    description: Keep governed data fresh.
  - id: build-model
    type: routine
    path: assets/routine.yaml
    description: Build and verify a governed model.
    access: mutate
    approval: required
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
  await ctx.plugin(SuperHarnessPackRegistry, {
    statePath: join(stateRoot, 'packs.json'),
    allowPluginManagement: true,
  })
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
    expect(ctx.hyperlakePacks.selection({ sessionId: 'session-pack' })).toEqual({
      sessionId: 'session-pack', selected: true, packId: 'data-engineering', version: '1.0.0',
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

  it('projects installation-owned tool attachments as non-removable', async () => {
    const ctx = await harness()
    const dispose = ctx.hyperlakePacks.registerInstallationAttachment({
      id: 'platform-tools', name: 'Platform tools', description: 'First-party tools.', providerId: 'platform',
      scope: 'shared', execution: 'local', outcomeIds: [], toolNames: ['platform_query'],
    })
    expect(ctx.hyperlakePacks.catalog().attachments).toContainEqual(expect.objectContaining({
      id: 'platform-tools', removable: false, toolNames: ['platform_query'],
    }))
    dispose()
    expect(ctx.hyperlakePacks.catalog().attachments).toEqual([])
  })

  it('starts exported goals and routines through the native goal tool with bounded authority', async () => {
    const session = Session.create(SessionId('session-autonomy'))
    const agent = { session } as Agent
    const ctx = await harness(id => id === 'session-autonomy' ? agent : undefined)
    const calls: Array<{ arguments: unknown; parent: unknown; agent: Agent | undefined }> = []
    ctx.tools.register(defineTool({
      name: 'create_goal', description: 'Native goal fixture.',
      parameters: {
        objective: { type: 'string', required: true },
        max_goal_rounds: { type: 'number', required: true },
      },
      output: { schema: { type: 'object', additionalProperties: true }, render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }] },
      execute: (args, exec) => {
        calls.push({ arguments: args, parent: exec.parent, agent: exec.agent })
        return Promise.resolve({ goalId: 'goal-1' })
      },
    }))
    ctx.hyperlakePacks.register(loadPackDirectory(fixture()), { defaultEnabled: true })
    expect(ctx.hyperlakePacks.configure({ packId: 'data-engineering', bindings: [{
      slotId: 'analytical-engine', resourceType: 'hyperlake-cluster', resourceId: 'cluster-123',
    }] }).ok).toBe(true)
    expect(ctx.hyperlakePacks.select({ sessionId: 'session-autonomy', packId: 'data-engineering' }).ok).toBe(true)

    const goal = await ctx.tools.execute({
      signal, callId: CallId('activate-goal'), name: 'superharness_goal_activate', agent,
      arguments: { pack_id: 'data-engineering', asset_id: 'freshness', max_goal_rounds: 7 },
    })
    expect(goal.isError).toBe(false)
    expect(calls[0]?.parent).toBeTypeOf('symbol')
    expect(calls[0]?.agent).toBe(agent)
    expect(calls[0]?.arguments).toMatchObject({ max_goal_rounds: 7 })
    expect(JSON.stringify(calls[0]?.arguments)).toContain('freshness_minutes')
    expect(JSON.stringify(calls[0]?.arguments)).toContain('cluster-123')

    const routine = await ctx.tools.execute({
      signal, callId: CallId('run-routine'), name: 'superharness_routine_run', agent,
      arguments: { pack_id: 'data-engineering', asset_id: 'build-model', inputs: { target: 'silver.orders' } },
    })
    expect(routine.isError).toBe(false)
    expect(JSON.stringify(calls[1]?.arguments)).toContain('catalog.inspect')
    expect(JSON.stringify(calls[1]?.arguments)).toContain('approval through the governed tool')
    expect(JSON.stringify(calls[1]?.arguments)).toContain('silver.orders')
  })

  it('rejects pack autonomy without session selection and above the deployment round ceiling', async () => {
    const session = Session.create(SessionId('session-autonomy-denied'))
    const agent = { session } as Agent
    const ctx = new Context()
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    ctx.provide('agents', { get: (id: string) => id === 'session-autonomy-denied' ? agent : undefined } as never)
    const stateRoot = mkdtempSync(join(tmpdir(), 'superharness-state-'))
    roots.push(stateRoot)
    await ctx.plugin(SuperHarnessPackRegistry, { statePath: join(stateRoot, 'packs.json'), maxAutonomyRounds: 4 })
    ctx.hyperlakePacks.register(loadPackDirectory(fixture()), { defaultEnabled: true })
    ctx.hyperlakePacks.configure({ packId: 'data-engineering', bindings: [{
      slotId: 'analytical-engine', resourceType: 'hyperlake-cluster', resourceId: 'cluster-123',
    }] })

    const unselected = await ctx.tools.execute({
      signal, callId: CallId('activate-unselected'), name: 'superharness_goal_activate', agent,
      arguments: { pack_id: 'data-engineering', asset_id: 'freshness' },
    })
    expect(unselected.isError).toBe(true)
    expect(JSON.stringify(unselected.content)).toContain('select pack')

    expect(ctx.hyperlakePacks.select({ sessionId: 'session-autonomy-denied', packId: 'data-engineering' }).ok).toBe(true)
    const excessive = await ctx.tools.execute({
      signal, callId: CallId('activate-excessive'), name: 'superharness_goal_activate', agent,
      arguments: { pack_id: 'data-engineering', asset_id: 'freshness', max_goal_rounds: 5 },
    })
    expect(excessive.isError).toBe(true)
    expect(JSON.stringify(excessive.content)).toContain('between 1 and 4')
  })

  it('composes the real solution, capability, and Hyperlake adapter manifests', async () => {
    const ctx = await harness()
    for (const directory of ['adapter-hyperlake', 'pack-data-engineering', 'solution-life-sciences']) {
      const root = fileURLToPath(new URL(`../../${directory}/`, import.meta.url))
      ctx.hyperlakePacks.register(loadPackDirectory(root), { defaultEnabled: true })
    }

    expect(ctx.hyperlakePacks.setOutcomes({ packId: 'data-engineering', outcomes: [{
      id: 'build-model', name: 'Build model', description: 'Build a governed model.',
      resourceSlotIds: ['data-environment', 'transformation-project'],
      entrypoint: { kind: 'workflow', reference: 'build-silver-layer' },
      approval: 'required', evaluationAssetIds: ['sql-safety-evaluation'],
    }] }).ok).toBe(true)
    expect(ctx.hyperlakePacks.validate('data-engineering', [{
      slotId: 'data-environment', resourceType: 'hyperlake-query-resource', resourceId: 'cluster-123',
    }])).toMatchObject({ valid: false, installedAdapters: ['hyperlake'], issues: [expect.stringContaining('requires unbound resource slot')] })
    expect(ctx.hyperlakePacks.validate('data-engineering', [
      { slotId: 'data-environment', resourceType: 'hyperlake-query-resource', resourceId: 'cluster-123' },
      { slotId: 'transformation-project', resourceType: 'dbt-project', resourceId: 'dbt-123' },
    ])).toMatchObject({ valid: true, installedAdapters: ['hyperlake'] })
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

  it('composes shared and capability-specific providers into enforced agent tool visibility', async () => {
    const session = Session.create(SessionId('session-composed'))
    const agent = { id: SessionId('session-composed') } as Agent
    const ctx = await harness(id => id === 'session-composed' ? agent : undefined)
    for (const name of ['core_tool', 'shared_tool', 'model_tool', 'alternate_tool', 'clinical_tool']) {
      ctx.tools.register(defineTool({
        name, description: name, parameters: {},
        output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] },
        execute: () => Promise.resolve(name),
      }))
    }
    let scope!: Scope
    await ctx.plugin(Object.assign((inner: Context) => { scope = createScope(inner, agent) }, { inject: ['tools', 'systemPrompt'] }))
    Object.assign(agent, { session, ctx: scope.ctx })

    expect(ctx.hyperlakePacks.createCapability({
      id: 'model-data', name: 'Model data', description: 'Build governed models.',
      outcomes: [
        { id: 'modeled-data', name: 'Modeled data', description: 'A verified model.' },
        { id: 'reviewed-data', name: 'Reviewed data', description: 'A reviewed model.' },
      ],
    }).ok).toBe(true)
    expect(ctx.hyperlakePacks.createCapability({
      id: 'clinical-analysis', name: 'Clinical analysis', description: 'Analyze permitted studies.',
      outcomes: [{ id: 'study-answer', name: 'Study answer', description: 'A governed answer.' }],
    }).ok).toBe(true)
    for (const attachment of [
      { id: 'shared-context', name: 'Shared context', description: 'Common discovery.', providerId: 'model-data', scope: 'shared' as const, execution: 'local' as const, outcomeIds: [], toolNames: ['shared_tool'] },
      { id: 'model-provider', name: 'Model provider', description: 'Model operations.', providerId: 'model-data', scope: 'capability' as const, capabilityId: 'model-data', execution: 'local' as const, outcomeIds: ['modeled-data'], toolNames: ['model_tool'] },
      { id: 'alternate-provider', name: 'Alternate provider', description: 'Review operations.', providerId: 'model-data', scope: 'capability' as const, capabilityId: 'model-data', execution: 'local' as const, outcomeIds: ['reviewed-data'], toolNames: ['alternate_tool'] },
      { id: 'clinical-provider', name: 'Clinical provider', description: 'Clinical operations.', providerId: 'clinical-analysis', scope: 'capability' as const, capabilityId: 'clinical-analysis', execution: 'platform' as const, outcomeIds: ['study-answer'], toolNames: ['clinical_tool'] },
    ]) expect(ctx.hyperlakePacks.upsertAttachment({ attachment }).ok).toBe(true)

    expect(ctx.hyperlakePacks.select({ sessionId: 'session-composed', packId: 'model-data', outcomeId: 'missing' })).toMatchObject({
      ok: false, message: 'Select a declared capability outcome.',
    })
    expect(ctx.hyperlakePacks.select({ sessionId: 'session-composed', packId: 'model-data', outcomeId: 'modeled-data' }).ok).toBe(true)
    expect(ctx.hyperlakePacks.select({ sessionId: 'session-composed', packId: 'clinical-analysis' })).toMatchObject({
      ok: false, message: 'A capability is already selected for this session.',
    })
    const visible = ctx.tools.schemas(agent).map(tool => tool.name)
    expect(visible).toContain('core_tool')
    expect(visible).toContain('shared_tool')
    expect(visible).toContain('model_tool')
    expect(visible).not.toContain('alternate_tool')
    expect(visible).not.toContain('clinical_tool')
    expect(ctx.hyperlakePacks.removeAttachment({ attachmentId: 'clinical-provider' }).ok).toBe(true)
    const resumedAgent = { ...agent, id: SessionId('session-composed-resumed') } as Agent
    const denied = await ctx.tools.execute({
      signal, callId: CallId('resume-denied'), name: 'clinical_tool', arguments: {}, agent: resumedAgent,
    })
    expect(denied.isError).toBe(true)
    expect(JSON.stringify(denied.content)).toContain('not attached to the selected Hyperlake capability')
    expect(session.events.at(-1)).toMatchObject({
      type: 'superharness/pack-selected',
      data: {
        outcomeId: 'modeled-data',
        outcomes: [{ id: 'modeled-data' }, { id: 'reviewed-data' }],
        toolNames: ['model_tool', 'shared_tool'],
        managedToolNames: ['alternate_tool', 'clinical_tool', 'model_tool', 'shared_tool'],
      },
    })
  })

  it('composes editable outcomes, discovered resources, and immutable plugin assets', async () => {
    const ctx = await harness()
    for (const directory of ['adapter-hyperlake', 'pack-data-engineering']) {
      const root = fileURLToPath(new URL(`../../${directory}/`, import.meta.url))
      ctx.hyperlakePacks.register(loadPackDirectory(root), { defaultEnabled: true })
    }
    expect(ctx.hyperlakePacks.createCapability({
      id: 'customer-analytics', name: 'Customer analytics', description: 'Analyze governed customer data.',
      outcomes: [{ id: 'answer', name: 'Answer', description: 'Produce an answer.' }],
    }).ok).toBe(true)
    expect(ctx.hyperlakePacks.setOutcomes({
      packId: 'customer-analytics', outcomes: [{ id: 'verified-answer', name: 'Verified answer', description: 'Produce a governed, tested answer.' }],
    }).ok).toBe(true)
    ctx.hyperlakePacks.registerResourceProvider({
      id: 'fixture-resources', pluginId: 'hyperlake', name: 'Fixture resources', description: 'Test provider.',
      resourceTypes: ['hyperlake-query-resource'],
      list: () => Promise.resolve([{ id: 'cluster-1', type: 'hyperlake-query-resource', name: 'Production', description: 'Production cluster.', providerId: 'fixture-resources' }]),
    })
    expect(await ctx.hyperlakePacks.discoverResources({ providerId: 'fixture-resources' })).toEqual([expect.objectContaining({ id: 'cluster-1' })])
    expect(ctx.hyperlakePacks.upsertResource({ packId: 'customer-analytics', resource: {
      id: 'production', name: 'Production', description: 'Production cluster.', providerId: 'fixture-resources',
      resourceType: 'hyperlake-query-resource', resourceId: 'cluster-1',
    } }).ok).toBe(true)
    expect(ctx.hyperlakePacks.attachAsset({
      packId: 'customer-analytics', sourcePackId: 'data-engineering', sourceAssetId: 'sql-safety-evaluation',
    }).ok).toBe(true)
    expect(ctx.hyperlakePacks.catalog().entries.find(entry => entry.id === 'customer-analytics')).toMatchObject({
      outcomes: [{ id: 'verified-answer' }],
      resources: [{ resourceId: 'cluster-1', providerId: 'fixture-resources' }],
      assets: [{ id: 'data-engineering.sql-safety-evaluation', type: 'evaluation', sourcePackId: 'data-engineering', attached: true }],
    })
    expect(ctx.hyperlakePacks.upsertResource({ packId: 'data-engineering', resource: {
      id: 'production', name: 'Production', description: 'Production cluster.', providerId: 'fixture-resources',
      resourceType: 'hyperlake-query-resource', resourceId: 'cluster-1',
    } }).ok).toBe(true)
    expect(ctx.hyperlakePacks.configure({ packId: 'data-engineering', bindings: [{
      slotId: 'data-environment', resourceType: 'hyperlake-query-resource', resourceId: 'cluster-1',
    }] }).ok).toBe(true)
    expect(ctx.hyperlakePacks.removeResource({ packId: 'data-engineering', resourceId: 'production' }).entry)
      .toMatchObject({ resources: [], bindings: [] })
  })

  it('rejects credential-bearing plugin URLs before invoking the package manager', async () => {
    const ctx = await harness()
    await expect(ctx.hyperlakePacks.installPlugin({ source: 'https://token@example.com/private/plugin.git', confirmed: true }))
      .resolves.toMatchObject({ ok: false, restartRequired: false })
  })
})
