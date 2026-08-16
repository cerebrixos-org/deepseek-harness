import { useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import type { PackCatalogEntry, PackCatalogSnapshot, PackConfigureRequest, PackOperationResult, PackSelectRequest, PackSelectionResult, PackSetEnabledRequest } from '@cerebrixos/superharness-packs/types'
import { IconCheckOutline14, IconChevronDownOutline14, IconLinkOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import css from './CapabilityLibrary.module.css'

export interface CapabilityLibraryInjected {
  catalog: () => Promise<PackCatalogSnapshot>
  setEnabled: (request: PackSetEnabledRequest) => Promise<PackOperationResult>
  configure: (request: PackConfigureRequest) => Promise<PackOperationResult>
  select: (request: PackSelectRequest) => Promise<PackSelectionResult>
}

export type CapabilityLibraryProps = PropsRuntime<'settings.plugins.tab'> & PropsLocale<'settings.capabilityLibrary'> & InjectFace<CapabilityLibraryInjected>
interface CapabilityLibraryViewProps extends CapabilityLibraryProps { surface?: 'settings' | 'home' }
type ViewState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; snapshot: PackCatalogSnapshot }
type DetailTab = 'overview' | 'resources' | 'assets' | 'evaluations'
type BindingDraft = Record<string, { resourceType: string; resourceId: string }>

function bindingsFor(entry: PackCatalogEntry): BindingDraft {
  return Object.fromEntries(entry.resourceSlots.map((slot) => {
    const binding = entry.bindings.find(candidate => candidate.slotId === slot.id)
    return [slot.id, { resourceType: binding?.resourceType ?? slot.types[0] ?? '', resourceId: binding?.resourceId ?? '' }]
  }))
}

export function CapabilityLibrary(props: CapabilityLibraryViewProps): ReactNode {
  const { catalog, setEnabled, configure, select, t, useSessions, surface = 'settings' } = props
  const detailsPrefix = useId()
  const sessions = useSessions(snapshot => snapshot)
  const currentSession = sessions.current === undefined ? undefined : sessions.byId[sessions.current]
  const [expanded, setExpanded] = useState<string | null>(surface === 'settings' ? 'data-engineering' : null)
  const [tab, setTab] = useState<DetailTab>('overview')
  const [state, setState] = useState<ViewState>({ status: 'loading' })
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<Record<string, string>>({})
  const [drafts, setDrafts] = useState<Record<string, BindingDraft>>({})

  const load = async (): Promise<void> => {
    try {
      const snapshot = await catalog()
      setState({ status: 'ready', snapshot })
      setDrafts(Object.fromEntries(snapshot.entries.map(entry => [entry.id, bindingsFor(entry)])))
    } catch { setState({ status: 'error' }) }
  }
  useEffect(() => { void load() }, [catalog])

  const mutate = async (packId: string, operation: () => Promise<PackOperationResult>): Promise<void> => {
    setBusy(packId)
    setNotice(current => ({ ...current, [packId]: '' }))
    try {
      const result = await operation()
      if (!result.ok) setNotice(current => ({ ...current, [packId]: result.message ?? t('operationFailed') }))
      else await load()
    } catch (error) {
      setNotice(current => ({ ...current, [packId]: error instanceof Error ? error.message : String(error) }))
    } finally { setBusy(null) }
  }

  const usePack = async (entry: PackCatalogEntry): Promise<void> => {
    if (currentSession === undefined || !currentSession.blank) {
      setNotice(current => ({ ...current, [entry.id]: t('blankSessionRequired') }))
      return
    }
    await mutate(entry.id, async () => {
      const result = await select({ sessionId: currentSession.id, packId: entry.id })
      if (result.ok) setNotice(current => ({ ...current, [entry.id]: t('selected') }))
      return result
    })
  }

  const entries = state.status === 'ready' ? state.snapshot.entries.filter(entry => entry.category !== 'adapter') : []
  return <div className={css.section} data-surface={surface} aria-busy={state.status === 'loading'}>
    {state.status === 'loading' ? <p className={css.message}>{t('loading')}</p> : null}
    {state.status === 'error' ? <div className={css.failure}><p role="alert">{t('error')}</p><button type="button" onClick={() => { void load() }}>{t('retry')}</button></div> : null}
    {state.status === 'ready' ? <div className={css.library}>
      <div className={css.heading}><h3>{surface === 'home' ? t('homeLibrary') : t('library')}</h3><span>{entries.length}</span></div>
      <ul className={css.cards}>{entries.map((entry) => {
        const open = expanded === entry.id
        const detailsId = `${detailsPrefix}-${entry.id}`
        const entryBusy = busy === entry.id
        const evaluations = entry.assets.filter(asset => asset.type === 'evaluation')
        const otherAssets = entry.assets.filter(asset => asset.type !== 'evaluation')
        const draft = drafts[entry.id] ?? bindingsFor(entry)
        return <li className={css.card} key={entry.id} data-open={open ? 'true' : undefined}>
          <div className={css.summary}>
            <button type="button" className={css.summaryToggle} aria-expanded={open} aria-controls={detailsId} onClick={() => { setExpanded(current => current === entry.id ? null : entry.id); setTab('overview') }}>
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
            <div className={css.tabs} role="tablist">{(['overview', 'resources', 'assets', 'evaluations'] as const).map(value => <button type="button" role="tab" aria-selected={tab === value} key={value} onClick={() => { setTab(value) }}>{t(value)}</button>)}</div>
            {tab === 'overview' ? <div className={css.overview}>
              <div><h4>{t('provides')}</h4><p>{entry.provides.join(', ') || t('none')}</p></div>
              <div><h4>{t('extends')}</h4><p>{entry.contributesTo.join(', ') || t('none')}</p></div>
              {entry.issues.length > 0 ? <ul className={css.issues}>{entry.issues.map(issue => <li key={issue}>{issue}</li>)}</ul> : <p className={css.valid}><IconCheckOutline14 />{t('validated')}</p>}
            </div> : null}
            {tab === 'resources' ? <div className={css.configure}>
              {entry.resourceSlots.map(slot => <fieldset key={slot.id}><legend>{slot.id} · {t(slot.required ? 'required' : 'optional')}</legend><p>{slot.description}</p>
                <label>{t('resourceType')}<select value={draft[slot.id]?.resourceType ?? ''} onChange={(event) => { const resourceType = event.target.value; setDrafts(current => ({ ...current, [entry.id]: { ...draft, [slot.id]: { ...draft[slot.id], resourceType, resourceId: draft[slot.id]?.resourceId ?? '' } } })) }}>{slot.types.map(type => <option key={type}>{type}</option>)}</select></label>
                <label>{t('resourceId')}<input value={draft[slot.id]?.resourceId ?? ''} onChange={(event) => { const resourceId = event.target.value; setDrafts(current => ({ ...current, [entry.id]: { ...draft, [slot.id]: { ...draft[slot.id], resourceType: draft[slot.id]?.resourceType ?? slot.types[0] ?? '', resourceId } } })) }} /></label>
              </fieldset>)}
              <button type="button" disabled={entryBusy} onClick={() => { void mutate(entry.id, () => configure({ packId: entry.id, bindings: Object.entries(draft).filter(([, value]) => value.resourceId.trim() !== '').map(([slotId, value]) => ({ slotId, resourceType: value.resourceType, resourceId: value.resourceId.trim() })) })) }}>{t('saveConfiguration')}</button>
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

function AssetList({ entries, empty, approval }: { entries: PackCatalogEntry['assets']; empty: string; approval: string }): ReactNode {
  const sorted = useMemo(() => [...entries].sort((a, b) => a.type.localeCompare(b.type) || a.id.localeCompare(b.id)), [entries])
  if (sorted.length === 0) return <p className={css.message}>{empty}</p>
  return <ul className={css.assets}>{sorted.map(asset => <li key={asset.id}><IconLinkOutline14 aria-hidden="true" /><span><strong>{asset.id}</strong><small>{asset.type}{asset.dialect ? ` · ${asset.dialect}` : ''}</small><p>{asset.description}</p></span>{asset.approval === 'required' ? <em>{approval}</em> : null}</li>)}</ul>
}

export function CapabilityHome(props: CapabilityLibraryProps): ReactNode { return <CapabilityLibrary {...props} surface="home" /> }
