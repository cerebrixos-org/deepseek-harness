import { useEffect, useId, useState, type ReactNode } from 'react'
import type { PluginInventorySnapshot } from '@deepseek-ai/dsh-api-remotes/client'
import {
  IconCheckOutline14,
  IconChevronDownOutline14,
  IconLinkOutline14,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { FIRST_PARTY_CAPABILITIES, type CapabilityResource } from './catalog.ts'
import type { CapabilityLibraryLocaleKey } from './locales.ts'
import css from './CapabilityLibrary.module.css'

/** Registration-side inventory face used by the library. */
export interface CapabilityLibraryInjected {
  list: () => Promise<PluginInventorySnapshot>
}

/** Props assembled by the Settings slot renderer. */
export type CapabilityLibraryProps =
  PropsRuntime<'settings.plugins.tab'>
  & PropsLocale<'settings.capabilityLibrary'>
  & InjectFace<CapabilityLibraryInjected>

type ViewState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; snapshot: PluginInventorySnapshot }

type InventoryEntry = PluginInventorySnapshot['entries'][number]

function moduleEntry(snapshot: PluginInventorySnapshot, moduleName: string): InventoryEntry | undefined {
  return snapshot.entries.find(entry => entry.moduleName === moduleName)
}

function resourceStatus(
  resource: CapabilityResource,
  snapshot: PluginInventorySnapshot,
): 'active' | 'failed' | 'supported' {
  if (resource.providerModule === undefined) return 'supported'
  const provider = moduleEntry(snapshot, resource.providerModule)
  return provider?.enabled === true && provider.fiberPhase === 'active' ? 'active' : 'failed'
}

function relationshipKey(resource: CapabilityResource): CapabilityLibraryLocaleKey {
  if (resource.relationship === 'provisioned') return 'provisioned'
  if (resource.relationship === 'enabled') return 'enabledResource'
  return 'connected'
}

/** Render first-party capabilities and their provisioned or connectable resources. */
export function CapabilityLibrary({ list, t }: CapabilityLibraryProps): ReactNode {
  const detailsPrefix = useId()
  const [request, setRequest] = useState(0)
  const [expanded, setExpanded] = useState<string | null>('data-engineering')
  const [state, setState] = useState<ViewState>({ status: 'loading' })

  useEffect(() => {
    let current = true
    void Promise.resolve().then(() => list()).then(
      (snapshot) => { if (current) setState({ status: 'ready', snapshot }) },
      () => { if (current) setState({ status: 'error' }) },
    )
    return () => { current = false }
  }, [list, request])

  const retry = (): void => {
    setState({ status: 'loading' })
    setRequest(value => value + 1)
  }

  return (
    <div className={css.section} aria-busy={state.status === 'loading'}>
      {state.status === 'loading' ? <p className={css.message}>{t('loading')}</p> : null}
      {state.status === 'error' ? (
        <div className={css.failure}>
          <p role="alert">{t('error')}</p>
          <button type="button" onClick={retry}>{t('retry')}</button>
        </div>
      ) : null}
      {state.status === 'ready' ? (
        <div className={css.library}>
          <div className={css.heading}>
            <h3>{t('library')}</h3>
            <span>{FIRST_PARTY_CAPABILITIES.length}</span>
          </div>
          <ul className={css.cards}>
            {FIRST_PARTY_CAPABILITIES.map((capability) => {
              const entry = moduleEntry(state.snapshot, capability.moduleName)
              const enabled = entry?.enabled === true
              const healthy = enabled && entry.fiberPhase === 'active'
              const open = expanded === capability.id
              const detailsId = `${detailsPrefix}-${capability.id}`
              return (
                <li className={css.card} key={capability.id} data-open={open ? 'true' : undefined}>
                  <button
                    type="button"
                    className={css.summary}
                    aria-expanded={open}
                    aria-controls={detailsId}
                    onClick={() => { setExpanded(current => current === capability.id ? null : capability.id) }}
                  >
                    <span className={css.identity}>
                      <span className={css.category}>{t(capability.category)}</span>
                      <strong>{capability.name}</strong>
                      <span className={css.description}>{capability.description}</span>
                    </span>
                    <span className={css.trailing}>
                      <span className={css.state} data-state={healthy ? 'active' : enabled ? 'failed' : 'disabled'}>
                        {healthy ? t('enabled') : enabled ? t('failed') : t('unavailable')}
                      </span>
                      <IconChevronDownOutline14 className={css.chevron} aria-hidden="true" />
                    </span>
                  </button>
                  {open ? (
                    <div className={css.details} id={detailsId}>
                      <h4>{t('resources')}</h4>
                      <ul className={css.resources}>
                        {capability.resources.map((resource) => {
                          const status = resourceStatus(resource, state.snapshot)
                          return (
                            <li key={resource.id}>
                              <span className={css.resourceIcon} data-status={status}>
                                {status === 'active'
                                  ? <IconCheckOutline14 aria-hidden="true" />
                                  : <IconLinkOutline14 aria-hidden="true" />}
                              </span>
                              <span className={css.resourceName}>{resource.label}</span>
                              <span className={css.relationship}>{t(relationshipKey(resource))}</span>
                              <span className={css.resourceStatus} data-status={status}>
                                {t(status)}{resource.optional === true ? ` · ${t('optional')}` : ''}
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
