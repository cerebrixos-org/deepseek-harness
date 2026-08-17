import { useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import type {
  CapabilityAttachmentRemoveRequest, CapabilityAttachmentUpsertRequest, CapabilityCreateRequest,
  CapabilityDeleteRequest, CapabilityProviderAttachment, PackCatalogEntry, PackCatalogSnapshot,
  PackConfigureRequest, PackOperationResult, PackSelectRequest, PackSelectionResult, PackSetEnabledRequest,
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
  const { catalog, setEnabled, configure, select, createCapability, deleteCapability, upsertAttachment, removeAttachment, t, useSessions, surface = 'settings' } = props
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
  const adapters = snapshot?.entries.filter(entry => entry.category === 'adapter' && entry.enabled) ?? []
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
        <AttachmentEditor scope="shared" outcomes={[]} tools={snapshot.availableTools} adapters={adapters}
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
              <OutcomeList entry={entry} empty={t('none')} />
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
                tools={snapshot.availableTools} adapters={adapters} busy={entryBusy} t={t}
                onSave={(attachment) => { void mutate(entry.id, () => upsertAttachment({ attachment })) }} />
            </div> : null}
            {tab === 'resources' ? <div className={css.configure}>
              {entry.resourceSlots.length === 0 ? <p className={css.message}>{t('none')}</p> : entry.resourceSlots.map(slot => <fieldset key={slot.id}><legend>{slot.id} · {t(slot.required ? 'required' : 'optional')}</legend><p>{slot.description}</p>
                <label>{t('resourceType')}<select value={draft[slot.id]?.resourceType ?? ''} onChange={(event) => { const resourceType = event.target.value; setDrafts(current => ({ ...current, [entry.id]: { ...draft, [slot.id]: { ...draft[slot.id], resourceType, resourceId: draft[slot.id]?.resourceId ?? '' } } })) }}>{slot.types.map(type => <option key={type}>{type}</option>)}</select></label>
                <label>{t('resourceId')}<input value={draft[slot.id]?.resourceId ?? ''} onChange={(event) => { const resourceId = event.target.value; setDrafts(current => ({ ...current, [entry.id]: { ...draft, [slot.id]: { ...draft[slot.id], resourceType: draft[slot.id]?.resourceType ?? slot.types[0] ?? '', resourceId } } })) }} /></label>
              </fieldset>)}
              {entry.resourceSlots.length > 0 ? <button type="button" disabled={entryBusy} onClick={() => { void mutate(entry.id, () => configure({ packId: entry.id, bindings: Object.entries(draft).filter(([, value]) => value.resourceId.trim() !== '').map(([slotId, value]) => ({ slotId, resourceType: value.resourceType, resourceId: value.resourceId.trim() })) })) }}>{t('saveConfiguration')}</button> : null}
            </div> : null}
            {tab === 'assets' ? <AssetList entries={otherAssets} empty={t('none')} approval={t('approvalRequired')} /> : null}
            {tab === 'evaluations' ? <AssetList entries={evaluations} empty={t('none')} approval={t('approvalRequired')} /> : null}
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

function AttachmentEditor({ scope, capabilityId, outcomes, tools, adapters, busy, t, onSave }: { scope: 'shared' | 'capability'; capabilityId?: string; outcomes: PackCatalogEntry['outcomes']; tools: PackCatalogSnapshot['availableTools']; adapters: PackCatalogEntry[]; busy: boolean; t: CapabilityLibraryViewProps['t']; onSave: (attachment: CapabilityProviderAttachment) => void }): ReactNode {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [providerId, setProviderId] = useState(adapters[0]?.id ?? 'custom')
  const [execution, setExecution] = useState<'local' | 'platform'>('local')
  const [toolNames, setToolNames] = useState<string[]>([])
  const [outcomeIds, setOutcomeIds] = useState<string[]>([])
  const submit = (): void => {
    const base = slug(name || providerId)
    onSave({ id: `${base || 'provider'}-${Date.now()}`, name: name || providerId, description: description || name || providerId, providerId, scope, ...(capabilityId ? { capabilityId } : {}), execution, outcomeIds, toolNames })
    setName(''); setDescription(''); setToolNames([]); setOutcomeIds([])
  }
  return <div className={css.attachmentEditor}><h4>{t(scope === 'shared' ? 'addSharedProvider' : 'addProvider')}</h4><div className={css.formGrid}>
    <label>{t('name')}<input value={name} onChange={(event) => { setName(event.target.value) }} /></label>
    <label>{t('provider')}<select value={providerId} onChange={(event) => { setProviderId(event.target.value) }}><option value="custom">{t('customProvider')}</option>{adapters.map(adapter => <option value={adapter.id} key={adapter.id}>{adapter.name}</option>)}</select></label>
    <label>{t('execution')}<select value={execution} onChange={(event) => { setExecution(event.target.value as 'local' | 'platform') }}><option value="local">{t('local')}</option><option value="platform">{t('platform')}</option></select></label>
    <label className={css.wide}>{t('description')}<input value={description} onChange={(event) => { setDescription(event.target.value) }} /></label>
    {outcomes.length > 0 ? <label>{t('outcomes')}<select multiple size={Math.min(6, outcomes.length)} value={outcomeIds} onChange={(event) => { setOutcomeIds([...event.currentTarget.selectedOptions].map(option => option.value)) }}>{outcomes.map(outcome => <option value={outcome.id} key={outcome.id}>{outcome.name}</option>)}</select></label> : null}
    <label className={outcomes.length === 0 ? css.wide : undefined}>{t('tools')}<select multiple size={Math.min(8, Math.max(3, tools.length))} value={toolNames} onChange={(event) => { setToolNames([...event.currentTarget.selectedOptions].map(option => option.value)) }}>{tools.map(tool => <option value={tool.name} key={tool.name}>{tool.name} — {tool.description}</option>)}</select></label>
  </div><button type="button" disabled={busy || toolNames.length === 0} onClick={submit}>{t('attach')}</button></div>
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

function OutcomeList({ entry, empty }: { entry: PackCatalogEntry; empty: string }): ReactNode {
  if (entry.outcomes.length === 0) return <p className={css.message}>{empty}</p>
  return <ul className={css.outcomes}>{entry.outcomes.map(outcome => <li key={outcome.id}>
    <strong>{outcome.name}</strong><p>{outcome.description}</p><small>{outcome.id}</small>
  </li>)}</ul>
}

function AssetList({ entries, empty, approval }: { entries: PackCatalogEntry['assets']; empty: string; approval: string }): ReactNode {
  const sorted = useMemo(() => [...entries].sort((a, b) => a.type.localeCompare(b.type) || a.id.localeCompare(b.id)), [entries])
  if (sorted.length === 0) return <p className={css.message}>{empty}</p>
  return <ul className={css.assets}>{sorted.map(asset => <li key={asset.id}><IconLinkOutline14 aria-hidden="true" /><span><strong>{asset.id}</strong><small>{asset.type}{asset.dialect ? ` · ${asset.dialect}` : ''}</small><p>{asset.description}</p></span>{asset.approval === 'required' ? <em>{approval}</em> : null}</li>)}</ul>
}

export function CapabilityHome(props: CapabilityHomeProps): ReactNode { return <CapabilityLibrary {...props} surface="home" /> }
