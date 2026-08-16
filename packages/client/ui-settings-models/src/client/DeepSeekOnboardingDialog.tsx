/**
 * Provider-neutral first-run step. Readiness comes from the same
 * provider/settings/credential join as the Models page. A user with no usable
 * provider chooses any route exposed by the installed adapters, stores its
 * credential once, and starts with that route's first available model.
 */

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { IApiClient } from '@deepseek-ai/dsh-api-remotes/client'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { ModelsSettingsState, ModelsSettingsStore, ProviderRow } from './store.ts'
import { onboardingReadiness } from './store.ts'
import { ProviderEditor } from './ProviderEditor.tsx'
import type { en } from './locales.ts'
import { OnboardingModal } from './OnboardingModal.tsx'
import styles from './DeepSeekOnboardingDialog.module.css'

type CurrentSessionId = Parameters<IApiClient['sessions']['selectModel']>[0]['sessionId']

const PROVIDER_LABELS: Readonly<Record<string, string>> = {
  'amazon-bedrock': 'Amazon Bedrock',
  'ant-ling': 'Ant Ling',
  anthropic: 'Anthropic',
  'azure-openai-responses': 'Azure OpenAI',
  cerebras: 'Cerebras',
  'cloudflare-ai-gateway': 'Cloudflare AI Gateway',
  'cloudflare-workers-ai': 'Cloudflare Workers AI',
  deepseek: 'DeepSeek',
  'deepseek-official': 'DeepSeek (official)',
  fireworks: 'Fireworks AI',
  'github-copilot': 'GitHub Copilot',
  google: 'Google AI',
  'google-vertex': 'Google Vertex AI',
  groq: 'Groq',
  huggingface: 'Hugging Face',
  'kimi-coding': 'Kimi Coding',
  minimax: 'MiniMax',
  'minimax-cn': 'MiniMax (China)',
  mistral: 'Mistral AI',
  moonshotai: 'Moonshot AI',
  'moonshotai-cn': 'Moonshot AI (China)',
  nvidia: 'NVIDIA',
  openai: 'OpenAI',
  opencode: 'OpenCode',
  'opencode-go': 'OpenCode Go',
  openrouter: 'OpenRouter',
  'qwen-token-plan': 'Qwen Token Plan',
  'qwen-token-plan-cn': 'Qwen Token Plan (China)',
  together: 'Together AI',
  'vercel-ai-gateway': 'Vercel AI Gateway',
  xai: 'xAI',
  xiaomi: 'Xiaomi',
  'xiaomi-token-plan-ams': 'Xiaomi Token Plan (Amsterdam)',
  'xiaomi-token-plan-cn': 'Xiaomi Token Plan (China)',
  'xiaomi-token-plan-sgp': 'Xiaomi Token Plan (Singapore)',
  zai: 'Z.ai',
  'zai-coding-cn': 'Z.ai Coding (China)',
}

function providerLabel(row: ProviderRow): string {
  return PROVIDER_LABELS[row.entry.provider] ?? row.entry.displayName
}

/** Registration-side dependencies of {@link DeepSeekOnboardingDialog}. */
export interface DeepSeekOnboardingInjected {
  hooks: {
    /** Shared Models-page join state, bound by the slot renderer. */
    models: SnapshotStore<ModelsSettingsState>
  }
  /** Shared Models-page join controller. */
  controller: ModelsSettingsStore
  /** Existing wire face reused by the Models credential editor. */
  api: Pick<IApiClient, 'settings' | 'credentials' | 'llm' | 'sessions'>
  /** Feature copy. */
  t: (key: keyof typeof en) => string
}

/** Slot owner props plus the feature's injected dependencies. */
export type DeepSeekOnboardingDialogProps =
  PropsRuntime<'settings.onboarding'> & InjectFace<DeepSeekOnboardingInjected>

/* v8 ignore next 3 -- closed-union defaults only defend future source widening */
function assertNever(_value: never): never {
  throw new Error('unexpected DeepSeek onboarding state')
}

/**
 * Prompt a first-run user to choose and configure any supported provider.
 * @param props - settings-shell owner state and Models feature dependencies.
 * @returns the onboarding modal or null when onboarding needs no intervention.
 */
export function DeepSeekOnboardingDialog(props: DeepSeekOnboardingDialogProps): ReactNode {
  const { complete, controller, useModels, useSessions, api, t } = props
  const state = useModels(snapshot => snapshot)
  const currentSession = useSessions(snapshot => snapshot.current)
  const readiness = onboardingReadiness(state)
  const candidates = useMemo(() => state.rows.filter(candidate =>
    candidate.entry.settingsNs.length > 0
    && state.namespaces.has(candidate.entry.settingsNs)), [state.namespaces, state.rows])
  const [selectedProvider, setSelectedProvider] = useState<string | undefined>(undefined)
  const [finishing, setFinishing] = useState(false)
  const [failure, setFailure] = useState<string | undefined>(undefined)
  const selected = candidates.find(candidate => candidate.entry.provider === selectedProvider)
    ?? candidates[0]

  useEffect(() => {
    if (state.status === 'idle') void controller.load()
  }, [controller, state.status])

  useEffect(() => {
    if (
      readiness.kind === 'adapter-absent'
      || (readiness.kind === 'provider-ready' && !finishing)
      || readiness.kind === 'unavailable'
    ) complete()
  }, [complete, readiness.kind])

  switch (readiness.kind) {
    case 'loading':
    case 'adapter-absent':
    case 'provider-ready':
    case 'unavailable':
      return null
    case 'credential-missing':
      break
    /* v8 ignore next -- every current readiness variant is handled above */
    default:
      return assertNever(readiness)
  }

  if (selected === undefined) return null
  const namespace = state.namespaces.get(selected.entry.settingsNs)
  /* v8 ignore next -- candidates are derived from rows with a resolved namespace. */
  if (namespace === undefined) return null

  const finishCredential = (changed: boolean, row: ProviderRow, sessionId: CurrentSessionId | undefined): void => {
    if (!changed) {
      complete()
      return
    }
    setFinishing(true)
    setFailure(undefined)
    void controller.load().then(async () => {
      const catalog = await api.llm.models({})
      if (!catalog.result.ok) throw new Error(catalog.result.error.message)
      const group = catalog.result.value.groups.find(candidate => candidate.id === row.entry.provider)
      const model = group?.models[0]
      if (model === undefined) throw new Error(t('onboardingNoModels'))
      const selection = { provider: row.entry.provider, model: model.id }
      const saved = await api.settings.replace({ ns: 'agent-default-model', section: selection })
      if (!saved.result.ok) throw new Error(saved.result.error.message)
      if (sessionId !== undefined) {
        const sessionSelection = await api.sessions.selectModel({ sessionId, ...selection })
        if (!sessionSelection.result.ok) throw new Error(sessionSelection.result.error.message)
      }
      complete()
    }).catch((error: unknown) => {
      setFailure(error instanceof Error ? error.message : String(error))
    }).finally(() => { setFinishing(false) })
  }

  return (
    <OnboardingModal title={t('onboardingTitle')}>
      <p className={styles.description}>{t('onboardingDescription')}</p>
      <label className={styles.providerField}>
        <span>{t('provider')}</span>
        <select
          className={styles.providerSelect}
          value={selected.entry.provider}
          disabled={finishing}
          onChange={(event) => {
            setSelectedProvider(event.target.value)
            setFailure(undefined)
          }}
        >
          {candidates.map(candidate => (
            <option key={candidate.entry.provider} value={candidate.entry.provider}>
              {providerLabel(candidate)}
            </option>
          ))}
        </select>
      </label>
      {failure === undefined ? null : <p className={styles.failure} role="alert">{failure}</p>}
      <div className={styles.editor}>
        <ProviderEditor
          key={selected.entry.provider}
          provider={selected.entry.provider}
          displayName={selected.entry.displayName}
          namespace={namespace}
          settingsPath={selected.entry.settingsPath}
          {...selected.entry.declared === true ? { declared: true } : {}}
          api={api}
          t={t}
          readOnly={finishing}
          hideTitle
          credentialRequired
          autoFocusCredential
          cancelLabel="onboardingLater"
          submitLabel="onboardingSave"
          submitBusyLabel="onboardingSaving"
          onClose={(changed) => { finishCredential(changed, selected, currentSession) }}
        />
      </div>
    </OnboardingModal>
  )
}
