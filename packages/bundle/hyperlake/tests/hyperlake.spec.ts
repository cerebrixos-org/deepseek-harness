import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Hyperlake SuperHarness bundle', () => {
  it('mounts the registry, Data Engineering capability, and Capability Library in order', () => {
    const root = fileURLToPath(new URL('..', import.meta.url))
    const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>
      dsh?: { bundle?: { patch?: string } }
    }
    const patchPath = manifest.dsh?.bundle?.patch
    if (patchPath === undefined) throw new Error('Hyperlake bundle must declare its patch')
    const patch = readFileSync(resolve(root, patchPath), 'utf8')

    const modules = [
      '@hyperlake/superharness-packs',
      '@hyperlake/superharness-pack-data-engineering',
      '@hyperlake/superharness-ui-capability-library',
    ]
    const positions = modules.map(moduleName => patch.indexOf(moduleName))
    expect(positions.every(position => position >= 0)).toBe(true)
    expect(modules.every(moduleName => manifest.dependencies?.[moduleName] === 'workspace:^')).toBe(true)
    expect(positions).toEqual([...positions].sort((left, right) => left - right))
  })
})
