/** Simplified Chinese dictionary and key source of truth. */
export const zh = {
  tab: '能力库',
  loading: '正在读取能力…',
  error: '暂时无法读取能力。',
  retry: '重试',
  library: 'Hyperlake 能力',
  capability: '能力',
  solution: '行业方案',
  enabled: '已启用',
  unavailable: '未启用',
  active: '可用',
  failed: '不可用',
  supported: '支持连接',
  optional: '可选',
  provisioned: '已配置',
  enabledResource: '已启用',
  connected: '连接',
  resources: '资源',
} satisfies Record<string, string>

/** Capability Library locale key union. */
export type CapabilityLibraryLocaleKey = keyof typeof zh

/** English dictionary checked against the Chinese key set. */
export const en = {
  tab: 'Capabilities',
  loading: 'Reading capabilities...',
  error: 'Capabilities are temporarily unavailable.',
  retry: 'Retry',
  library: 'Hyperlake capabilities',
  capability: 'Capability',
  solution: 'Industry solution',
  enabled: 'Enabled',
  unavailable: 'Not enabled',
  active: 'Available',
  failed: 'Unavailable',
  supported: 'Supported',
  optional: 'Optional',
  provisioned: 'Provisioned',
  enabledResource: 'Enabled',
  connected: 'Connected',
  resources: 'Resources',
} satisfies Record<CapabilityLibraryLocaleKey, string>
