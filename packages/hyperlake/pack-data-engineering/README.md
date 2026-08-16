# `@hyperlake/superharness-pack-data-engineering`

This native DeepSeek/Cordis bundle plugin is the reusable data-engineering capability layer beneath industry solution packs. It exports a sample silver-layer DDL, a governed build routine, a freshness goal template, a SQL-safety evaluation, and operating guidance through the shared deterministic pack tools.

The pack declares an analytical-engine resource slot and accepts Hyperlake or Databricks adapters. It contains no credentials or concrete customer resource ids.

## Model Experience

### Data-engineering guidance and assets

#### What the model sees

A concise data-engineering prompt section, one pack-catalog description, and an asset's exact contents only after `superharness_pack_asset_read`.

#### Token effect

The prompt section is fixed; descriptions and asset contents append through explicit tool results.

#### KV Cache effect

The guidance is a stable prompt section. Installing or removing the bundle changes the request prefix once; asset reads append to history.

## Known Limitations and Deferred Work

- The examples are starting points; execution and approval remain owned by the selected adapter.
