/** Test a DeepSeek Harness upstream merge in an isolated worktree before applying it. */

import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { attempt, capture, isEntry, run } from './release/process.ts'

export interface UpgradeOptions {
  readonly apply: boolean
  readonly baseRef: string
  readonly fetch: boolean
  readonly full: boolean
  readonly upstreamRef: string
}

interface UpgradeCommand {
  readonly command: string
  readonly args: readonly string[]
  readonly env?: NodeJS.ProcessEnv
  readonly label: string
}

const DEFAULT_UPSTREAM_REF = 'upstream/master'
const FOCUSED_TESTS = [
  'packages/hyperlake/packs/tests/packs.spec.ts',
  'packages/hyperlake/ui-capability-library/tests/components.client.spec.tsx',
  'packages/bundle/hyperlake/tests/hyperlake.spec.ts',
] as const

/** Parse the deliberately small, automation-friendly command surface. */
export function parseUpgradeOptions(args: readonly string[]): UpgradeOptions {
  const parsed = parseArgs({
    args: [...args],
    allowPositionals: false,
    strict: true,
    options: {
      apply: { type: 'boolean', default: false },
      base: { type: 'string', default: 'HEAD' },
      full: { type: 'boolean', default: false },
      'skip-fetch': { type: 'boolean', default: false },
      upstream: { type: 'string', default: DEFAULT_UPSTREAM_REF },
    },
  })
  return {
    apply: parsed.values.apply,
    baseRef: parsed.values.base,
    fetch: !parsed.values['skip-fetch'],
    full: parsed.values.full,
    upstreamRef: parsed.values.upstream,
  }
}

/** Ordered gates run against the merged disposable checkout. */
export function upgradeCommands(full: boolean): readonly UpgradeCommand[] {
  const commands: UpgradeCommand[] = [
    { label: 'install locked dependencies', command: 'pnpm', args: ['install', '--frozen-lockfile'] },
    { label: 'verify workspace constraints', command: 'pnpm', args: ['run', 'constraints'] },
    { label: 'typecheck host and client contracts', command: 'pnpm', args: ['run', 'typecheck'] },
    {
      label: 'run Hyperlake integration tests', command: 'pnpm',
      args: ['exec', 'vitest', 'run', ...FOCUSED_TESTS, '--reporter=dot'],
    },
    { label: 'build the client libraries', command: 'pnpm', args: ['run', 'build:lib:client'] },
    { label: 'build the production web application', command: 'pnpm', args: ['run', 'build:web'] },
    {
      label: 'boot the Hyperlake profile with an MCP subprocess', command: 'pnpm',
      args: [
        'exec', 'vitest', 'run', '--config', 'vitest.e2e.config.ts',
        'apps/cli/tests/hyperlake-profile.e2e.ts', '--reporter=dot',
      ],
    },
    {
      label: 'compose the keyless Hyperlake profile', command: 'pnpm',
      args: ['dsh', '--profile', 'hyperlake', '--dump-default-config'],
      env: { ...process.env, SUPERHARNESS_HYPERLAKE_DISABLED: '1' },
    },
  ]
  if (full) commands.push({ label: 'run the complete repository gate suite', command: 'pnpm', args: ['run', 'check:all'] })
  return commands
}

function assertClean(repository: string): void {
  const status = capture('git', ['status', '--porcelain'], { cwd: repository })
  if (status !== '') throw new Error('the current worktree must be clean before checking an upstream upgrade')
}

function fetchUpstream(repository: string, upstreamRef: string): void {
  const separator = upstreamRef.indexOf('/')
  if (separator <= 0) throw new Error('--upstream must name a fetched remote ref, for example upstream/master')
  const remote = upstreamRef.slice(0, separator)
  console.log(`upgrade check: fetching ${remote}`)
  run('git', ['fetch', remote, '--prune'], { cwd: repository })
}

function mergeInWorktree(worktree: string, upstreamCommit: string): void {
  const result = attempt('git', [
    '-c', 'user.name=Hyperlake Upgrade Check',
    '-c', 'user.email=upgrade-check@hyperlake.local',
    'merge', '--no-commit', '--no-ff', upstreamCommit,
  ], { cwd: worktree })
  if (result.status === 0) return
  const conflicts = attempt('git', ['diff', '--name-only', '--diff-filter=U'], { cwd: worktree }).stdout.trim()
  throw new Error([
    `upstream merge failed with status ${String(result.status)}`,
    conflicts === '' ? undefined : `conflicts:\n${conflicts}`,
    result.stderr.trim(),
  ].filter(Boolean).join('\n'))
}

/** Execute the isolated upgrade check and optionally apply the tested commit. */
export function verifyUpstreamUpgrade(options: UpgradeOptions): void {
  const repository = capture('git', ['rev-parse', '--show-toplevel'])
  assertClean(repository)
  if (options.apply && options.baseRef !== 'HEAD') throw new Error('--apply requires the default --base HEAD')
  if (options.fetch) fetchUpstream(repository, options.upstreamRef)

  const baseCommit = capture('git', ['rev-parse', '--verify', `${options.baseRef}^{commit}`], { cwd: repository })
  const upstreamCommit = capture('git', ['rev-parse', '--verify', `${options.upstreamRef}^{commit}`], { cwd: repository })
  const relation = capture('git', ['rev-list', '--left-right', '--count', `${baseCommit}...${upstreamCommit}`], { cwd: repository })
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'hyperlake-upstream-upgrade-'))
  const worktree = join(temporaryRoot, 'checkout')
  let worktreeAdded = false

  console.log('upgrade check: plan')
  console.log(`  base:     ${baseCommit}`)
  console.log(`  upstream: ${upstreamCommit} (${options.upstreamRef})`)
  console.log(`  relation: ${relation} (base-only, upstream-only)`)
  console.log(`  gates:    ${options.full ? 'full' : 'focused'}`)

  try {
    run('git', ['worktree', 'add', '--detach', worktree, baseCommit], { cwd: repository })
    worktreeAdded = true
    mergeInWorktree(worktree, upstreamCommit)
    for (const step of upgradeCommands(options.full)) {
      console.log(`upgrade check: ${step.label}`)
      run(step.command, step.args, { cwd: worktree, ...step.env === undefined ? {} : { env: step.env } })
    }
  } finally {
    if (worktreeAdded) {
      attempt('git', ['merge', '--abort'], { cwd: worktree })
      run('git', ['worktree', 'remove', '--force', worktree], { cwd: repository })
    }
    rmSync(temporaryRoot, { recursive: true, force: true })
    attempt('git', ['worktree', 'prune'], { cwd: repository })
  }

  console.log(`upgrade check: compatible with ${options.upstreamRef} at ${upstreamCommit}`)
  if (!options.apply) {
    console.log('upgrade check: no branch was changed; rerun with --apply to merge this tested upstream commit')
    return
  }

  assertClean(repository)
  const currentCommit = capture('git', ['rev-parse', 'HEAD'], { cwd: repository })
  if (currentCommit !== baseCommit) throw new Error('HEAD changed while the isolated upgrade check was running; refusing to apply')
  run('git', ['merge', '--no-ff', '--no-edit', upstreamCommit], { cwd: repository })
  console.log(`upgrade check: applied tested upstream commit ${upstreamCommit}`)
}

if (isEntry(import.meta.url)) verifyUpstreamUpgrade(parseUpgradeOptions(process.argv.slice(2)))
