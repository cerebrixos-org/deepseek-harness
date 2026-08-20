import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execa } from 'execa'
import { describe, expect, it } from 'vitest'

const cli = fileURLToPath(new URL('../lib/bin.js', import.meta.url))
const fixture = fileURLToPath(new URL('./fixtures/mcp-server.mjs', import.meta.url))

describe('Hyperlake profile', () => {
  it('boots the Web surface with its configured MCP subprocess', async () => {
    const home = mkdtempSync(join(tmpdir(), 'hyperlake-profile-e2e-'))
    const child = execa(process.execPath, [cli, '--profile', 'hyperlake', '--port', '0', '--no-open'], {
      reject: false,
      env: {
        ...process.env,
        DSH_HOME: home,
        SUPERHARNESS_HYPERLAKE_COMMAND: process.execPath,
        SUPERHARNESS_HYPERLAKE_SCRIPT: fixture,
      },
    })
    let stdout = ''
    let stderr = ''
    const ready = Promise.withResolvers<undefined>()
    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
      if (stdout.includes('Hyperlake SuperHarness: http://127.0.0.1:')) ready.resolve(undefined)
    })
    child.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString() })
    void child.then((result) => {
      ready.reject(new Error(`profile exited before readiness with code ${String(result.exitCode)}; stdout:\n${stdout}\nstderr:\n${stderr}`))
    })
    const timeout = setTimeout(() => {
      ready.reject(new Error(`profile did not become ready; stdout:\n${stdout}\nstderr:\n${stderr}`))
    }, 30_000)
    try {
      await ready.promise
      child.kill('SIGTERM')
      const result = await child
      expect(result.exitCode).toBe(0)
      expect(stdout).toContain('Hyperlake SuperHarness: http://127.0.0.1:')
    } finally {
      clearTimeout(timeout)
      child.kill('SIGKILL')
      rmSync(home, { recursive: true, force: true })
    }
  }, 40_000)
})
