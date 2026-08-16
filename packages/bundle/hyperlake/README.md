# `@hyperlake/superharness-base`

This bundle adds the portable Hyperlake pack registry to a DeepSeek Harness profile. It stores no credentials and adds no target adapter by itself. Install adapter and solution-pack bundles as later profile layers.

## Model Experience

### Registry composition

#### What the model sees

The fixed discovery, validation, and asset tools contributed by `@hyperlake/superharness-packs`; this bundle contributes no prompt text of its own.

#### Token effect

Only later tool calls and results add data-dependent tokens.

#### KV Cache effect

The bundle adds only the registry's fixed tool schemas.

## Known Limitations and Deferred Work

- Target connectivity requires a separately installed adapter bundle.
