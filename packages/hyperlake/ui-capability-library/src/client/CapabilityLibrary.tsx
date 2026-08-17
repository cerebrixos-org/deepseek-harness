import { useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import type {
  CapabilityAssetAttachRequest, CapabilityAssetRemoveRequest, CapabilityAttachmentRemoveRequest,
  CapabilityAttachmentUpsertRequest, CapabilityCreateRequest, CapabilityDeleteRequest,
  CapabilityOutcomesSetRequest, CapabilityProviderAttachment, CapabilityResourceRemoveRequest,
  CapabilityResourceUpsertRequest, PackCatalogEntry, PackCatalogSnapshot, PackConfigureRequest,
  PackOperationResult, PackSelectRequest, PackSelectionResult, PackSetEnabledRequest,
  PluginInstallRequest, PluginOperationResult, PluginRemoveRequest, PluginResourceDiscoverRequest,
  PluginResourceView,
} from '@cerebrixos/superharness-packs/types'
import { IconCheckOutline14, IconChevronDownOutline14, IconLinkOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import css from './CapabilityLibrary.module.css'

export interface CapabilityLibraryInjected {
  catalog: () => Promise<PackCatalogSnapshot>
  setEnabled: (request: PackSetEnabledRequest) => Promise<PackOperationResult>
  configure: (request: PackConfigureRequest) => Promise<PackOperationResult>
  select: (request: PackSelectRequest) => Promise<PackSelectionResult>
  createCapability: (request: CapabilityCreateRequest) => Promise<PackOperationResult>
  deleteCapability: (request: CapabilityDeleteRequest) => Promise<PackOperationResult>
  upsertAttachment: (request: CapabilityAttachmentUpsertRequest) => Promise<PackOperationResult>
  removeAttachment: (request: CapabilityAttachmentRemoveRequest) => Promise<PackOperationResult>
  setOutcomes: (request: CapabilityOutcomesSetRequest) => Promise<PackOperationResult>
  attachAsset: (request: CapabilityAssetAttachRequest) => Promise<PackOperationResult>
  removeAsset: (request: CapabilityAssetRemoveRequest) => Promise<PackOperationResult>
  upsertResource: (request: CapabilityResourceUpsertRequest) => Promise<PackOperationResult>
  removeResource: (request: CapabilityResourceRemoveRequest) => Promise<PackOperationResult>
  discoverResources: (request: PluginResourceDiscoverRequest) => Promise<PluginResourceView[]>
  installPlugin: (request: PluginInstallRequest) => Promise<PluginOperationResult>
  removePlugin: (request: PluginRemoveRequest) => Promise<PluginOperationResult>
}

export type CapabilityLibraryProps = PropsRuntime<'settings.section'> & PropsLocale<'settings.capabilityLibrary'> & InjectFace<CapabilityLibraryInjected>
export type CapabilityHomeProps = CapabilityLibraryInjected & PropsLocale<'settings.capabilityLibrary'> & Pick<CapabilityLibraryProps, 'useSessions'>
interface CapabilityLibraryViewProps extends CapabilityLibraryInjected, PropsLocale<'settings.capabilityLibrary'> {
  useSessions: CapabilityLibraryProps['useSessions']
  surface?: 'settings' | 'home'
}
type ViewState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; snapshot: PackCatalogSnapshot }
type DetailTab = 'outcomes' | 'providers' | 'resources' | 'assets' | 'evaluations'
type BindingDraft = Record<string, { resourceType: string; resourceId: string }>

function bindingsFor(entry: PackCatalogEntry): BindingDraft {
  return Object.fromEntries(entry.resourceSlots.map((slot) => {
    const binding = entry.bindings.find(candidate => candidate.slotId === slot.id)
    return [slot.id, { resourceType: binding?.resourceType ?? slot.types[0] ?? '', resourceId: binding?.resourceId ?? '' }]
  }))
}

function slug(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9.-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 96)
}

export function CapabilityLibrary(props: CapabilityLibraryViewProps): ReactNode {
  const {
    catalog, setEnabled, configure, select, createCapability, deleteCapability, upsertAttachment,
    removeAttachment, setOutcomes, attachAsset, removeAsset, upsertResource, removeResource,
    discoverResources, t, useSessions, surface = 'settings',
  } = props
  const detailsPrefix = useId()
  const sessions = useSessions(snapshot => snapshot)
  const currentSession = sessions.current === undefined ? undefined : sessions.byId[sessions.current]
  const [expanded, setExpanded] = useState<string | null>(surface === 'settings' ? 'data-engineering' : null)
  const [tab, setTab] = useState<DetailTab>('outcomes')
  const [state, setState] = useState<ViewState>({ status: 'loading' })
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<Record<string, string>>({})
  const [drafts, setDrafts] = useState<Record<string, BindingDraft>>({})
  const [creating, setCreating] = useState(false)

  const load = async (): Promise<void> => {
    try {
      const snapshot = await catalog()
      setState({ status: 'ready', snapshot })
      setDrafts(Object.fromEntries(snapshot.entries.map(entry => [entry.id, bindingsFor(entry)])))
    } catch { setState({ status: 'error' }) }
  }
  useEffect(() => { void load() }, [catalog])

  const mutate = async (key: string, operation: () => Promise<PackOperationResult>): Promise<boolean> => {
    setBusy(key)
    setNotice(current => ({ ...current, [key]: '' }))
    try {
      const result = await operation()
      if (!result.ok) { setNotice(current => ({ ...current, [key]: result.message ?? t('operationFailed') })); return false }
      await load()
      return true
    } catch (error) {
      setNotice(current => ({ ...current, [key]: error instanceof Error ? error.message : String(error) }))
      return false
    } finally { setBusy(null) }
  }

  const usePack = async (entry: PackCatalogEntry): Promise<void> => {
    if (currentSession === undefined || !currentSession.blank) {
      setNotice(current => ({ ...current, [entry.id]: t('blankSessionRequired') }))
      return
    }
    const ok = await mutate(entry.id, () => select({ sessionId: currentSession.id, packId: entry.id }))
    if (ok) setNotice(current => ({ ...current, [entry.id]: t('selected') }))
  }

  const snapshot = state.status === 'ready' ? state.snapshot : undefined
  const entries = snapshot?.entries.filter(entry => entry.category !== 'adapter') ?? []
  const plugins = snapshot === undefined ? [] : [
    ...snapshot.entries.filter(entry => entry.enabled).map(entry => ({ id: entry.id, name: entry.name })),
    ...snapshot.installedPlugins.map(plugin => ({ id: plugin.packageName, name: plugin.packageName })),
  ].filter((plugin, index, all) => all.findIndex(candidate => candidate.id === plugin.id) === index)
  const shared = snapshot?.attachments.filter(attachment => attachment.scope === 'shared') ?? []

  return <div className={css.section} data-surface={surface} aria-busy={state.status === 'loading'}>
    {state.status === 'loading' ? <p className={css.message}>{t('loading')}</p> : null}
    {state.status === 'error' ? <div className={css.failure}><p role="alert">{t('error')}</p><button type="button" onClick={() => { void load() }}>{t('retry')}</button></div> : null}
    {snapshot ? <div className={css.library}>
      <div className={css.heading}><h3>{surface === 'home' ? t('homeLibrary') : t('library')}</h3><span>{entries.length}</span>{surface === 'settings' ? <button type="button" className={css.headingAction} onClick={() => { setCreating(value => !value) }}>{creating ? t('cancel') : t('newCapability')}</button> : null}</div>
      {surface === 'settings' && creating ? <CapabilityCreator busy={busy === 'create'} {...notice.create === undefined ? {} : { notice: notice.create }} t={t} onCreate={async (request) => {
        const ok = await mutate('create', () => createCapability(request))
        if (ok) { setCreating(false); setExpanded(request.id) }
      }} /> : null}
      {surface === 'settings' ? <section className={css.shared} aria-labelledby={`${detailsPrefix}-shared`}>
        <div><h4 id={`${detailsPrefix}-shared`}>{t('sharedProviders')}</h4><p>{t('sharedProvidersDescription')}</p></div>
        <AttachmentList attachments={shared} removable busy={busy} t={t}
          onRemove={(id) => { void mutate('shared', () => removeAttachment({ attachmentId: id })) }} />
        <AttachmentEditor scope="shared" outcomes={[]} tools={snapshot.availableTools} plugins={plugins}
          busy={busy === 'shared'} t={t}
          onSave={(attachment) => { void mutate('shared', () => upsertAttachment({ attachment })) }} />
        {notice.shared ? <p className={css.notice} role="status">{notice.shared}</p> : null}
      </section> : null}
      <ul className={css.cards}>{entries.map((entry) => {
        const open = expanded === entry.id
        const detailsId = `${detailsPrefix}-${entry.id}`
        const entryBusy = busy === entry.id
        const evaluations = entry.assets.filter(asset => asset.type === 'evaluation')
        const otherAssets = entry.assets.filter(asset => asset.type !== 'evaluation')
        const draft = drafts[entry.id] ?? bindingsFor(entry)
        const scoped = snapshot.attachments
          .filter(attachment => attachment.scope === 'capability' && attachment.capabilityId === entry.id)
        return <li className={css.card} key={entry.id} data-open={open ? 'true' : undefined}>
          <div className={css.summary}>
            <button type="button" className={css.summaryToggle} aria-expanded={open} aria-controls={detailsId} onClick={() => { setExpanded(current => current === entry.id ? null : entry.id); setTab('outcomes') }}>
              <span className={css.identity}><span className={css.category}>{t(entry.category === 'solution' ? 'solution' : 'capability')} · v{entry.version}</span><strong>{entry.name}</strong><span className={css.description}>{entry.description}</span></span>
              <IconChevronDownOutline14 className={css.chevron} aria-hidden="true" />
            </button>
            <div className={css.actions}>
              <span className={css.state} data-state={entry.ready ? 'active' : entry.enabled ? 'failed' : 'disabled'}>{entry.ready ? t('ready') : entry.enabled ? t('needsSetup') : t('disabled')}</span>
              <button type="button" disabled={entryBusy} onClick={() => { void mutate(entry.id, () => setEnabled({ packId: entry.id, enabled: !entry.enabled })) }}>{entry.enabled ? t('disable') : t('enable')}</button>
              <button type="button" disabled={entryBusy || !entry.ready} onClick={() => { void usePack(entry) }}>{t('use')}</button>
            </div>
          </div>
          {open ? <div className={css.details} id={detailsId}>
            <div className={css.tabs} role="tablist">{(['outcomes', 'providers', 'resources', 'assets', 'evaluations'] as const).map(value => <button type="button" role="tab" aria-selected={tab === value} key={value} onClick={() => { setTab(value) }}>{t(value)}</button>)}</div>
            {tab === 'outcomes' ? <div className={css.overview}>
              <OutcomeEditor entry={entry} busy={entryBusy} t={t}
                onSave={(outcomes) => { void mutate(entry.id, () => setOutcomes({ packId: entry.id, outcomes })) }} />
              {entry.issues.length > 0 ? <ul className={css.issues}>{entry.issues.map(issue => <li key={issue}>{issue}</li>)}</ul> : <p className={css.valid}><IconCheckOutline14 />{t('validated')}</p>}
              {entry.userCreated ? <button className={css.danger} type="button" disabled={entryBusy} onClick={() => { void mutate(entry.id, () => deleteCapability({ packId: entry.id })) }}>{t('deleteCapability')}</button> : null}
            </div> : null}
            {tab === 'providers' ? <div className={css.providerPanel}>
              {shared.length > 0 ? <><h4>{t('inheritedProviders')}</h4>
                <AttachmentList attachments={shared} busy={busy} t={t} /></> : null}
              <h4>{t('capabilityProviders')}</h4>
              <AttachmentList attachments={scoped} removable busy={busy} t={t}
                onRemove={(id) => { void mutate(entry.id, () => removeAttachment({ attachmentId: id })) }} />
              <AttachmentEditor scope="capability" capabilityId={entry.id} outcomes={entry.outcomes}
                tools={snapshot.availableTools} plugins={plugins} busy={entryBusy} t={t}
                onSave={(attachment) => { void mutate(entry.id, () => upsertAttachment({ attachment })) }} />
              <p className={css.message}>{snapshot.coreTools.length} {t('coreToolsUniversal')}</p>
            </div> : null}
            {tab === 'resources' ? <div className={css.configure}>
              {entry.resourceSlots.length === 0 ? <p className={css.message}>{t('none')}</p> : entry.resourceSlots.map(slot => <fieldset key={slot.id}><legend>{slot.id} · {t(slot.required ? 'required' : 'optional')}</legend><p>{slot.description}</p>
                <label>{t('attachedResource')}<select value={draft[slot.id]?.resourceId ?? ''} onChange={(event) => {
                  const resource = entry.resources.find(candidate => candidate.resourceId === event.target.value)
                  setDrafts(current => ({ ...current, [entry.id]: { ...draft, [slot.id]: { resourceType: resource?.resourceType ?? '', resourceId: resource?.resourceId ?? '' } } }))
                }}><option value="">{t('selectResource')}</option>{entry.resources.filter(resource => slot.types.includes(resource.resourceType)).map(resource => <option value={resource.resourceId} key={resource.id}>{resource.name}</option>)}</select></label>
              </fieldset>)}
              {entry.resourceSlots.length > 0 ? <button type="button" disabled={entryBusy} onClick={() => { void mutate(entry.id, () => configure({ packId: entry.id, bindings: Object.entries(draft).filter(([, value]) => value.resourceId.trim() !== '').map(([slotId, value]) => ({ slotId, resourceType: value.resourceType, resourceId: value.resourceId.trim() })) })) }}>{t('saveConfiguration')}</button> : null}
              <ResourceComposer entry={entry} providers={snapshot.resourceProviders} busy={entryBusy} t={t}
                discover={discoverResources}
                onAttach={(resource) => { void mutate(entry.id, () => upsertResource({ packId: entry.id, resource })) }}
                onRemove={(resourceId) => { void mutate(entry.id, () => removeResource({ packId: entry.id, resourceId })) }} />
            </div> : null}
            {tab === 'assets' ? <AssetComposer entry={entry} entries={otherAssets}
              sources={snapshot.entries} kind="asset" busy={entryBusy} t={t}
              onAttach={(sourcePackId, sourceAssetId) => {
                void mutate(entry.id, () => attachAsset({ packId: entry.id, sourcePackId, sourceAssetId }))
              }}
              onRemove={(attachmentId) => { void mutate(entry.id, () => removeAsset({ packId: entry.id, attachmentId })) }} /> : null}
            {tab === 'evaluations' ? <AssetComposer entry={entry} entries={evaluations}
              sources={snapshot.entries} kind="evaluation" busy={entryBusy} t={t}
              onAttach={(sourcePackId, sourceAssetId) => {
                void mutate(entry.id, () => attachAsset({ packId: entry.id, sourcePackId, sourceAssetId }))
              }}
              onRemove={(attachmentId) => { void mutate(entry.id, () => removeAsset({ packId: entry.id, attachmentId })) }} /> : null}
            {notice[entry.id] ? <p className={css.notice} role="status">{notice[entry.id]}</p> : null}
          </div> : null}
        </li>
      })}</ul>
    </div> : null}
  </div>
}

function CapabilityCreator({ busy, notice, t, onCreate }: { busy: boolean; notice?: string; t: CapabilityLibraryViewProps['t']; onCreate: (request: CapabilityCreateRequest) => Promise<void> }): ReactNode {
  const [name, setName] = useState('')
  const [id, setId] = useState('')
  const [description, setDescription] = useState('')
  const [outcomes, setOutcomes] = useState('')
  const submit = (): void => {
    const parsed = outcomes.split('\n').map(line => line.trim()).filter(Boolean).map((line) => {
      const [outcomeId, outcomeName, ...detail] = line.split('|').map(value => value.trim())
      return { id: slug(outcomeId ?? ''), name: outcomeName || outcomeId || '', description: detail.join(' | ') || outcomeName || outcomeId || '' }
    })
    void onCreate({ id: slug(id || name), name, description, outcomes: parsed })
  }
  return <section className={css.creator}><h4>{t('newCapability')}</h4><div className={css.formGrid}>
    <label>{t('name')}<input value={name} onChange={(event) => { setName(event.target.value); if (id === '') setId(slug(event.target.value)) }} /></label>
    <label>{t('capabilityId')}<input value={id} onChange={(event) => { setId(slug(event.target.value)) }} /></label>
    <label className={css.wide}>{t('description')}<textarea value={description} onChange={(event) => { setDescription(event.target.value) }} /></label>
    <label className={css.wide}>{t('outcomeFormat')}<textarea value={outcomes} placeholder="trusted-analysis | Trusted analysis | Produce a governed, cited answer" onChange={(event) => { setOutcomes(event.target.value) }} /></label>
  </div><button type="button" disabled={busy} onClick={submit}>{t('create')}</button>{notice ? <p className={css.notice}>{notice}</p> : null}</section>
}

function AttachmentEditor({ scope, capabilityId, outcomes, tools, plugins, busy, t, onSave }: { scope: 'shared' | 'capability'; capabilityId?: string; outcomes: PackCatalogEntry['outcomes']; tools: PackCatalogSnapshot['availableTools']; plugins: Array<{ id: string; name: string }>; busy: boolean; t: CapabilityLibraryViewProps['t']; onSave: (attachment: CapabilityProviderAttachment) => void }): ReactNode {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [providerId, setProviderId] = useState(plugins[0]?.id ?? '')
  const [execution, setExecution] = useState<'local' | 'platform'>('local')
  const [toolNames, setToolNames] = useState<string[]>([])
  const [outcomeIds, setOutcomeIds] = useState<string[]>([])
  useEffect(() => { if (providerId === '' && plugins[0] !== undefined) setProviderId(plugins[0].id) }, [plugins, providerId])
  const submit = (): void => {
    const base = slug(name || providerId)
    onSave({ id: `${base || 'provider'}-${Date.now()}`, name: name || providerId, description: description || name || providerId, providerId, scope, ...(capabilityId ? { capabilityId } : {}), execution, outcomeIds, toolNames })
    setName(''); setDescription(''); setToolNames([]); setOutcomeIds([])
  }
  return <div className={css.attachmentEditor}><h4>{t(scope === 'shared' ? 'addSharedProvider' : 'addProvider')}</h4><div className={css.formGrid}>
    <label>{t('name')}<input value={name} onChange={(event) => { setName(event.target.value) }} /></label>
    <label>{t('provider')}<select value={providerId} onChange={(event) => { setProviderId(event.target.value) }}><option value="">{t('selectPlugin')}</option>{plugins.map(plugin => <option value={plugin.id} key={plugin.id}>{plugin.name}</option>)}</select></label>
    <label>{t('execution')}<select value={execution} onChange={(event) => { setExecution(event.target.value as 'local' | 'platform') }}><option value="local">{t('local')}</option><option value="platform">{t('platform')}</option></select></label>
    <label className={css.wide}>{t('description')}<input value={description} onChange={(event) => { setDescription(event.target.value) }} /></label>
    {outcomes.length > 0 ? <label>{t('outcomes')}<select multiple size={Math.min(6, outcomes.length)} value={outcomeIds} onChange={(event) => { setOutcomeIds([...event.currentTarget.selectedOptions].map(option => option.value)) }}>{outcomes.map(outcome => <option value={outcome.id} key={outcome.id}>{outcome.name}</option>)}</select></label> : null}
    <label className={outcomes.length === 0 ? css.wide : undefined}>{t('tools')}<select multiple size={Math.min(8, Math.max(3, tools.length))} value={toolNames} onChange={(event) => { setToolNames([...event.currentTarget.selectedOptions].map(option => option.value)) }}>{tools.map(tool => <option value={tool.name} key={tool.name}>{tool.name} — {tool.description}</option>)}</select></label>
  </div><button type="button" disabled={busy || providerId === '' || toolNames.length === 0} onClick={submit}>{t('attach')}</button></div>
}

function AttachmentList({ attachments, removable = false, busy, t, onRemove }: {
  attachments: CapabilityProviderAttachment[]
  removable?: boolean
  busy: string | null
  t: CapabilityLibraryViewProps['t']
  onRemove?: (id: string) => void
}): ReactNode {
  if (attachments.length === 0) return <p className={css.message}>{t('noProviders')}</p>
  return <ul className={css.attachments}>{attachments.map(attachment => <li key={attachment.id}><div><strong>{attachment.name}</strong><small>{attachment.scope === 'shared' ? t('shared') : t('capabilitySpecific')} · {attachment.execution}</small><p>{attachment.description}</p><code>{attachment.toolNames.join(', ')}</code></div>{removable && onRemove ? <button type="button" disabled={busy !== null} onClick={() => { onRemove(attachment.id) }}>{t('remove')}</button> : null}</li>)}</ul>
}

function OutcomeEditor({ entry, busy, t, onSave }: { entry: PackCatalogEntry; busy: boolean; t: CapabilityLibraryViewProps['t']; onSave: (outcomes: PackCatalogEntry['outcomes']) => void }): ReactNode {
  const serialize = (): string => entry.outcomes.map(outcome => `${outcome.id} | ${outcome.name} | ${outcome.description}`).join('\n')
  const [value, setValue] = useState(serialize)
  useEffect(() => { setValue(serialize()) }, [entry.id, entry.outcomes])
  const save = (): void => {
    const outcomes = value.split('\n').map(line => line.trim()).filter(Boolean).map((line) => {
      const [id, name, ...description] = line.split('|').map(part => part.trim())
      return { id: slug(id ?? ''), name: name || id || '', description: description.join(' | ') || name || id || '' }
    })
    onSave(outcomes)
  }
  return <div className={css.configure}><label>{t('outcomeFormat')}<textarea value={value} onChange={(event) => { setValue(event.target.value) }} /></label><button type="button" disabled={busy} onClick={save}>{t('saveOutcomes')}</button></div>
}

function ResourceComposer({ entry, providers, busy, t, discover, onAttach, onRemove }: {
  entry: PackCatalogEntry
  providers: PackCatalogSnapshot['resourceProviders']
  busy: boolean
  t: CapabilityLibraryViewProps['t']
  discover: (request: PluginResourceDiscoverRequest) => Promise<PluginResourceView[]>
  onAttach: (resource: CapabilityResourceUpsertRequest['resource']) => void
  onRemove: (resourceId: string) => void
}): ReactNode {
  const [providerId, setProviderId] = useState(providers[0]?.id ?? '')
  const [resources, setResources] = useState<PluginResourceView[]>([])
  const [selected, setSelected] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const load = async (): Promise<void> => {
    if (providerId === '') return
    setLoading(true); setError('')
    try {
      setResources(await discover({ providerId }))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setLoading(false)
    }
  }
  const attach = (): void => {
    const resource = resources.find(candidate => candidate.id === selected)
    if (resource === undefined) return
    onAttach({
      id: slug(`${resource.providerId}-${resource.id}`), name: resource.name, description: resource.description,
      providerId: resource.providerId, resourceType: resource.type, resourceId: resource.id,
    })
  }
  return <section className={css.providerPanel}><h4>{t('attachedResources')}</h4>
    {entry.resources.length === 0 ? <p className={css.message}>{t('none')}</p> : <ul className={css.attachments}>{entry.resources.map(resource => <li key={resource.id}><div><strong>{resource.name}</strong><small>{resource.resourceType} · {resource.providerId}</small><p>{resource.description}</p></div><button type="button" disabled={busy} onClick={() => { onRemove(resource.id) }}>{t('remove')}</button></li>)}</ul>}
    <div className={css.formGrid}><label>{t('provider')}<select value={providerId} onChange={(event) => { setProviderId(event.target.value); setResources([]); setSelected('') }}><option value="">{t('selectPlugin')}</option>{providers.map(provider => <option value={provider.id} key={provider.id}>{provider.name}</option>)}</select></label>
      <button type="button" disabled={loading || providerId === ''} onClick={() => { void load() }}>{loading ? t('loading') : t('discoverResources')}</button>
      <label className={css.wide}>{t('resource')}<select value={selected} onChange={(event) => { setSelected(event.target.value) }}><option value="">{t('selectResource')}</option>{resources.map(resource => <option value={resource.id} key={`${resource.providerId}:${resource.id}`}>{resource.name} · {resource.type}</option>)}</select></label>
    </div><button type="button" disabled={busy || selected === ''} onClick={attach}>{t('attach')}</button>{error ? <p role="alert" className={css.notice}>{error}</p> : null}</section>
}

function AssetComposer({ entry, entries, sources, kind, busy, t, onAttach, onRemove }: {
  entry: PackCatalogEntry
  entries: PackCatalogEntry['assets']
  sources: PackCatalogSnapshot['entries']
  kind: 'asset' | 'evaluation'
  busy: boolean
  t: CapabilityLibraryViewProps['t']
  onAttach: (sourcePackId: string, sourceAssetId: string) => void
  onRemove: (attachmentId: string) => void
}): ReactNode {
  const candidates = sources.flatMap(source => source.id === entry.id ? [] : source.assets
    .filter(asset => kind === 'evaluation' ? asset.type === 'evaluation' : asset.type !== 'evaluation')
    .map(asset => ({ source, asset })))
  const [selection, setSelection] = useState('')
  const attach = (): void => {
    const [sourcePackId, sourceAssetId] = selection.split('::')
    if (sourcePackId && sourceAssetId) onAttach(sourcePackId, sourceAssetId)
  }
  return <div className={css.configure}><AssetList entries={entries} empty={t('none')} approval={t('approvalRequired')} removeLabel={t('remove')} onRemove={onRemove} busy={busy} />
    <label>{t(kind === 'evaluation' ? 'addEvaluation' : 'addAsset')}<select value={selection} onChange={(event) => { setSelection(event.target.value) }}><option value="">{t('selectPluginContribution')}</option>{candidates.map(({ source, asset }) => <option value={`${source.id}::${asset.sourceAssetId}`} key={`${source.id}:${asset.sourceAssetId}`}>{source.name} · {asset.id}</option>)}</select></label>
    <button type="button" disabled={busy || selection === ''} onClick={attach}>{t('attach')}</button></div>
}

function AssetList({ entries, empty, approval, removeLabel, onRemove, busy = false }: { entries: PackCatalogEntry['assets']; empty: string; approval: string; removeLabel: string; onRemove?: (id: string) => void; busy?: boolean }): ReactNode {
  const sorted = useMemo(() => [...entries].sort((a, b) => a.type.localeCompare(b.type) || a.id.localeCompare(b.id)), [entries])
  if (sorted.length === 0) return <p className={css.message}>{empty}</p>
  return <ul className={css.assets}>{sorted.map(asset => <li key={asset.id}><IconLinkOutline14 aria-hidden="true" /><span><strong>{asset.id}</strong><small>{asset.type}{asset.dialect ? ` · ${asset.dialect}` : ''} · {asset.sourcePackId}</small><p>{asset.description}</p></span>{asset.approval === 'required' ? <em>{approval}</em> : null}{asset.attached && onRemove ? <button type="button" disabled={busy} onClick={() => { onRemove(asset.id) }}>{removeLabel}</button> : null}</li>)}</ul>
}

export function CapabilityHome(props: CapabilityHomeProps): ReactNode { return <CapabilityLibrary {...props} surface="home" /> }

type PluginCategory = 'installed' | 'tools' | 'resources' | 'assets' | 'evaluations' | 'outcomes'

/** Profile plugin installation and typed-contribution catalog. */
export function PluginCatalog({ catalog, installPlugin, removePlugin, t }: CapabilityLibraryInjected & Pick<CapabilityLibraryProps, 't'>): ReactNode {
  const [state, setState] = useState<ViewState>({ status: 'loading' })
  const [category, setCategory] = useState<PluginCategory>('installed')
  const [source, setSource] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [removing, setRemoving] = useState('')
  const load = async (): Promise<void> => {
    try { setState({ status: 'ready', snapshot: await catalog() }) } catch { setState({ status: 'error' }) }
  }
  useEffect(() => { void load() }, [catalog])
  const install = async (): Promise<void> => {
    setBusy(true); setNotice('')
    try {
      const result = await installPlugin({ source, confirmed })
      setNotice(result.message)
      if (result.ok) { setSource(''); setConfirmed(false); await load() }
    } catch (error) { setNotice(error instanceof Error ? error.message : String(error)) } finally { setBusy(false) }
  }
  const remove = async (packageName: string): Promise<void> => {
    setBusy(true); setNotice('')
    try { const result = await removePlugin({ packageName, confirmed: true }); setNotice(result.message); if (result.ok) await load() } catch (error) { setNotice(error instanceof Error ? error.message : String(error)) } finally { setBusy(false); setRemoving('') }
  }
  if (state.status === 'loading') return <p className={css.message}>{t('loading')}</p>
  if (state.status === 'error') return <div className={css.failure}><p role="alert">{t('error')}</p><button type="button" onClick={() => { void load() }}>{t('retry')}</button></div>
  const snapshot = state.snapshot
  const assets = snapshot.entries.flatMap(entry => entry.assets.filter(asset => asset.type !== 'evaluation').map(asset => ({ entry, asset })))
  const evaluations = snapshot.entries.flatMap(entry => entry.assets.filter(asset => asset.type === 'evaluation').map(asset => ({ entry, asset })))
  const outcomes = snapshot.entries.flatMap(entry => entry.outcomes.map(outcome => ({ entry, outcome })))
  return <div className={css.section}><section className={css.creator}><h3>{t('installPlugin')}</h3><p>{t('pluginCredentialHelp')}</p>
    <div className={css.formGrid}><label className={css.wide}>{t('pluginSource')}<input value={source} placeholder="@scope/package@1.2.3, github:org/repo#commit, git+ssh://..., /absolute/path" onChange={(event) => { setSource(event.target.value) }} /></label>
      <label className={`${css.wide} ${css.confirmRow}`}><input type="checkbox" checked={confirmed}
        onChange={(event) => { setConfirmed(event.target.checked) }} />{t('confirmPluginInstall')}</label></div>
    <button type="button" disabled={busy || source.trim() === '' || !confirmed} onClick={() => { void install() }}>{t('install')}</button>{notice ? <p role="status" className={css.notice}>{notice}</p> : null}</section>
  <div className={css.tabs} role="tablist">{(['installed', 'tools', 'resources', 'assets', 'evaluations', 'outcomes'] as const).map(item => <button type="button" role="tab" aria-selected={category === item} key={item} onClick={() => { setCategory(item) }}>{t(item)}</button>)}</div>
  {category === 'installed' ? <ul className={css.attachments}>{snapshot.installedPlugins.map(plugin => <li key={plugin.packageName}><div><strong>{plugin.packageName}</strong><small>{plugin.version} · {plugin.bundle ? t('bundlePlugin') : t('libraryPlugin')}</small><p>{plugin.description}</p><code>{plugin.source}</code></div>{removing === plugin.packageName ? <span><button type="button" disabled={busy} onClick={() => { void remove(plugin.packageName) }}>{t('confirmRemove')}</button><button type="button" onClick={() => { setRemoving('') }}>{t('cancel')}</button></span> : <button type="button" disabled={busy} onClick={() => { setRemoving(plugin.packageName) }}>{t('remove')}</button>}</li>)}</ul> : null}
  {category === 'tools' ? <ul className={css.outcomes}>{snapshot.availableTools.map(tool => <li key={tool.name}><strong>{tool.name}</strong><p>{tool.description}</p></li>)}</ul> : null}
  {category === 'resources' ? <ul className={css.outcomes}>{snapshot.resourceProviders.map(provider => <li key={provider.id}><strong>{provider.name}</strong><p>{provider.description}</p><small>{provider.pluginId} · {provider.resourceTypes.join(', ')}</small></li>)}</ul> : null}
  {category === 'assets' ? <ul className={css.outcomes}>{assets.map(({ entry, asset }) => <li key={`${entry.id}:${asset.id}`}><strong>{asset.id}</strong><p>{asset.description}</p><small>{entry.name} · {asset.type}</small></li>)}</ul> : null}
  {category === 'evaluations' ? <ul className={css.outcomes}>{evaluations.map(({ entry, asset }) => <li key={`${entry.id}:${asset.id}`}><strong>{asset.id}</strong><p>{asset.description}</p><small>{entry.name}</small></li>)}</ul> : null}
  {category === 'outcomes' ? <ul className={css.outcomes}>{outcomes.map(({ entry, outcome }) => <li key={`${entry.id}:${outcome.id}`}><strong>{outcome.name}</strong><p>{outcome.description}</p><small>{entry.name} · {outcome.id}</small></li>)}</ul> : null}
  </div>
}
