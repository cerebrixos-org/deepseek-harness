/** Durable settings namespace for product-wide GUI onboarding facts. */
export const WELCOME_NOTICE_SETTINGS_NAMESPACE = 'ui-onboarding'

/** Field storing the last welcome notice version the user acknowledged. */
export const WELCOME_NOTICE_ACK_FIELD = 'welcomeNoticeVersion'

/**
 * Bump only when the notice changes materially and every user should see it
 * again. The acknowledgement is compared for exact equality.
 */
export const WELCOME_NOTICE_VERSION = '2026-08-16.1'

/** The complete editable internal-testing notice in both supported GUI locales. */
export const WELCOME_NOTICE_COPY = {
  zh: {
    title: '欢迎使用 Hyperlake SuperHarness',
    body: 'Hyperlake SuperHarness 是用于治理基础设施、应用和数据工作的本地 AI 运行环境。它将您选择的模型与 Hyperlake 能力、审批、技能和解决方案包组合在一起，同时让凭据和执行保持在本地。',
    continueLabel: '继续',
  },
  en: {
    title: 'Welcome to Hyperlake SuperHarness',
    body: 'Hyperlake SuperHarness is a local AI runtime for governed infrastructure, application, and data work. It combines your chosen model with Hyperlake capabilities, approvals, skills, and solution packs while keeping credentials and execution local.',
    continueLabel: 'Continue',
  },
} as const
