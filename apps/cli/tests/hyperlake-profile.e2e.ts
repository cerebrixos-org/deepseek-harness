import { fileURLToPath } from 'node:url'
import { execa } from 'execa'
import { describe, expect, it } from 'vitest'

const cli = fileURLToPath(new URL('../lib/bin.js', import.meta.url))
const fixture = fileURLToPath(new URL('./fixtures/mcp-server.mjs', import.meta.url))

describe('Hyperlake profile', () => {
  it('boots the Web surface with its configured MCP subprocess', async () => {
    const child = execa(process.execPath, [cli, '--profile', 'hyperlake', '--port', '0'], {
      reject: false,
      env: {
        ...process.env,
        SUPERHARNESS_HYPERLAKE_COMMAND: process.execPath,
        SUPERHARNESS_HYPERLAKE_SCRIPT: fixture,
      },
    })
    let stdout = ''
    const ready = Promise.withResolvers<undefined>()
    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
      if (stdout.includes('Hyperlake SuperHarness: http://127.0.0.1:')) ready.resolve(undefined)
    })
    const timeout = setTimeout(() => { ready.reject(new Error(`profile did not become ready; stdout:\n${stdout}`)) }, 30_000)
    try {
      await ready.promise
      child.kill('SIGTERM')
      const result = await child
      expect(result.exitCode).toBe(0)
      expect(stdout).toContain('Hyperlake SuperHarness: http://127.0.0.1:')
    } finally {
      clearTimeout(timeout)
      child.kill('SIGKILL')
    }
  }, 40_000)
})
