# `@cerebrixos/superharness-packs`

English | [中文](README.zh.md)

This package is the portable pack registry for Hyperlake SuperHarness. A pack is both an installable DeepSeek/Cordis bundle plugin and a directory carrying `hyperlake-pack.yaml`. The common manifest supports capability, adapter, domain, asset, governance, and solution categories without creating incompatible formats.

Pack assets are explicit exports. `superharness_pack_list`, `superharness_pack_describe`, `superharness_pack_validate`, and `superharness_pack_asset_read` let a model discover, validate, and read DDL, SQL, dbt, notebooks, semantic models, dashboards, routines, goals, evaluations, and references deterministically. Validation keeps installation separate from activation by checking dependencies, adapter capabilities, typed customer resource bindings, provider availability, and attached tool names. Asset paths are confined to the canonical pack root, including symlink resolution, and reads have a configurable byte limit.

Capabilities declare explicit user-facing outcomes. Core Harness tools are universal and cannot be redundantly attached. A deployment may attach optional installed-plugin tools either globally, where they are cross-cutting, or to one capability. It may also discover provider-owned resources, store their opaque ids, and attach plugin-exported assets or evaluations with immutable source provenance. Selecting a capability snapshots its outcomes, bindings, resources, providers, and tool names into the session. Agent-scoped tool restrictions hide tools assigned only to other capabilities, and an execution guard preserves the same rule after session resume.

The typed lifecycle API supports creating and deleting user-owned capabilities, editing outcomes, attaching or removing resources and assets, discovering provider resources, managing provider attachments, and installing or removing profile plugins. Plugin mutation requires explicit confirmation, rejects credential-bearing URLs, runs with argument-safe package-manager invocation, and requires a restart. It is disabled by default and enabled explicitly by the local Hyperlake profile.

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

- Plugin installation changes only the selected local profile. Private registry and Git authentication stay in npm configuration or the user's SSH agent.
- Asset execution is delegated to adapter tools; the registry does not translate Spark SQL, notebooks, or engine-specific DDL.
- Tool composition is a runtime visibility and dispatch boundary, not a replacement for authorization in Hyperlake or a customer provider.
