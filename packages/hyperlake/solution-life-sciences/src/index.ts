/** Life-sciences solution-pack registration. @module @cerebrixos/superharness-solution-life-sciences */
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-system-prompt'
import { registerPackDirectory } from '@cerebrixos/superharness-packs'

/** Cordis plugin name. */
export const name = 'superharness-solution-life-sciences'
/** Services required by this solution pack. */
export const inject = ['hyperlakePacks', 'systemPrompt']
/** Register accelerator assets and domain selection guidance. */
export function apply(ctx: Context): void {
  const root = fileURLToPath(new URL('../', import.meta.url))
  ctx.effect(() => registerPackDirectory(ctx, root), 'superharness-solution-life-sciences.pack')
  ctx.effect(() => ctx.systemPrompt.section({
    name: 'superharness:solution:life-sciences',
    order: 171,
    text: 'For life-sciences accelerator tasks, preserve source asset dialect and provenance. Do not claim a Databricks notebook or Spark SQL asset is portable to Trino unless its pack metadata says so. Bind concrete customer resources before execution and use deterministic evaluations for regulated outputs.',
  }), 'superharness-solution-life-sciences.prompt')
}
