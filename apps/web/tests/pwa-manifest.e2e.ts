import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { expect, it } from 'vitest'

const DIST_ROOT = fileURLToPath(new URL('../dist', import.meta.url))

it('ships install metadata with the built web application', async () => {
  const index = await readFile(join(DIST_ROOT, 'index.html'), 'utf8')
  expect(index).toContain('<link rel="manifest" href="/manifest.webmanifest" />')

  const manifest: unknown = JSON.parse(await readFile(join(DIST_ROOT, 'manifest.webmanifest'), 'utf8'))
  expect(manifest).toEqual({
    id: '/',
    name: 'Hyperlake SuperHarness',
    short_name: 'SuperHarness',
    start_url: '/',
    scope: '/',
    display: 'fullscreen',
    icons: [{
      src: '/hyperlake-logo.png',
      sizes: '500x500',
      type: 'image/png',
      purpose: 'any',
    }],
  })
})

it('ships the Hyperlake product mark', async () => {
  const logo = await readFile(join(DIST_ROOT, 'hyperlake-logo.png'))
  expect([...logo.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
})
