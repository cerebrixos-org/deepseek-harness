import { describe, expect, it } from 'vitest'
import { parseUpgradeOptions, upgradeCommands } from './verify-upstream-upgrade.ts'

describe('upstream upgrade verification', () => {
  it('defaults to a fetched, focused, non-mutating check', () => {
    expect(parseUpgradeOptions([])).toEqual({
      apply: false,
      baseRef: 'HEAD',
      fetch: true,
      full: false,
      upstreamRef: 'upstream/master',
    })
  })

  it('accepts explicit automation options', () => {
    expect(parseUpgradeOptions([
      '--apply', '--full', '--skip-fetch', '--base', 'HEAD', '--upstream', 'vendor/main',
    ])).toEqual({
      apply: true,
      baseRef: 'HEAD',
      fetch: false,
      full: true,
      upstreamRef: 'vendor/main',
    })
  })

  it('runs compatibility gates and adds the full suite only when requested', () => {
    const focused = upgradeCommands(false)
    expect(focused.map(command => command.label)).toEqual([
      'install locked dependencies',
      'verify workspace constraints',
      'typecheck host and client contracts',
      'run Hyperlake integration tests',
      'build the client libraries',
      'build the production web application',
      'boot the Hyperlake profile with an MCP subprocess',
      'compose the keyless Hyperlake profile',
    ])
    expect(focused.at(-1)?.env?.SUPERHARNESS_HYPERLAKE_DISABLED).toBe('1')
    expect(upgradeCommands(true).at(-1)).toMatchObject({
      label: 'run the complete repository gate suite',
      command: 'pnpm',
      args: ['run', 'check:all'],
    })
  })
})
