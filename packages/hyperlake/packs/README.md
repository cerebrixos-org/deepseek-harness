# `@cerebrixos/superharness-packs`

English | [中文](README.zh.md)

This package is the portable pack registry for Hyperlake SuperHarness. A pack is both an installable DeepSeek/Cordis bundle plugin and a directory carrying `hyperlake-pack.yaml`. The common manifest supports capability, adapter, domain, asset, governance, and solution categories without creating incompatible formats.

Pack assets are explicit exports. `superharness_pack_list`, `superharness_pack_describe`, `superharness_pack_validate`, and `superharness_pack_asset_read` let a model discover, validate, and read DDL, SQL, dbt, notebooks, semantic models, dashboards, routines, goals, evaluations, and references deterministically. Validation keeps installation separate from activation by checking dependencies, adapter capabilities, typed customer resource bindings, provider availability, and attached tool names. Asset paths are confined to the canonical pack root, including symlink resolution, and reads have a configurable byte limit.

Capabilities declare explicit user-facing outcomes. A deployment may attach installed tools through a named provider either globally, where the tools are cross-cutting, or to one capability. Selecting a capability snapshots its outcomes, bindings, providers, and tool names into the session. Agent-scoped tool restrictions hide tools assigned only to other capabilities, and an execution guard preserves the same rule after session resume. Tools not managed by capability composition remain available, so the ordinary Harness surface and direct Hyperlake usage continue to work.

The typed lifecycle API also supports creating and deleting user-owned capabilities and adding or removing provider attachments. It records only non-secret provider metadata and tool names. Package installation remains an administrator-controlled CLI operation.

The registry stores no credentials and performs no target execution. Adapter plugins connect pack requirements to Hyperlake or customer-owned tools. Capability restrictions control agent-visible composition; target services remain responsible for authentication, authorization, policy, and approval enforcement.

## Model Experience

### Pack catalog and assets

#### What the model sees

Four stable tools from `superharness_pack_list` through `superharness_pack_asset_read` for selecting and reading explicitly exported pack assets. Installed content appears only in tool results.

#### Token effect

The tool definitions are fixed; selected manifests and asset contents append only after calls.

#### KV Cache effect

The four tool schemas remain prefix-stable. Pack descriptions and asset contents enter context only after explicit tool calls and append to session history.

## Known Limitations and Deferred Work

- Pack installation remains explicit. Validation reports missing pack dependencies but does not install them automatically.
- Asset execution is delegated to adapter tools; the registry does not translate Spark SQL, notebooks, or engine-specific DDL.
- Tool composition is a runtime visibility and dispatch boundary, not a replacement for authorization in Hyperlake or a customer provider.
