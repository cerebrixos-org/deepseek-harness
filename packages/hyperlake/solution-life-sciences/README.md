# `@hyperlake/superharness-solution-life-sciences`

This example solution bundle demonstrates a Databricks-style industry accelerator assembled as a native SuperHarness plugin. It depends on the reusable data-engineering pack, accepts Hyperlake or Databricks for portable operations, and marks its Spark SQL/Delta DDL as Databricks-only instead of silently translating it.

The included model is illustrative and original to this repository. It does not copy the Databricks industry-solutions repository and is not a validated clinical standard.

## Model Experience

### Life-sciences guidance and assets

#### What the model sees

A concise provenance and dialect-safety prompt section, one solution description, and exact model, routine, or evaluation content only after `superharness_pack_asset_read`.

#### Token effect

The prompt section is fixed; descriptions and asset contents append through explicit tool results.

#### KV Cache effect

The guidance is a stable prompt section. Asset contents enter history only after explicit reads.

## Known Limitations and Deferred Work

- The included assets are illustrative and are not validated clinical standards.
