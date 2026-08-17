# Hyperlake SuperHarness

Hyperlake SuperHarness is a downstream DeepSeek Harness composition for governed infrastructure and data work. It preserves the Harness runtime and plugin model while mounting existing Hyperlake CLI/MCP capabilities and installable capability or industry-solution content.

## Architecture

The implementation has four deliberately separate layers:

1. The Harness owns conversations, model calls, tool lifecycle, approvals, goals, jobs, skills, and local execution.
2. The pack registry owns descriptions, requirements, typed resource slots, and explicitly exported assets. It does not store credentials or execute against customer systems.
3. Adapter plugins provide outcome capabilities and mount existing tool surfaces. The Hyperlake adapter starts `hyperlake mcp serve --stdio` unchanged; provider mechanics remain implementation details beneath governed data, metadata, lineage, observability, policy, workflow, and platform access.
4. Capability and solution packs compose reusable procedures and industry assets. Data Engineering is horizontal; Life Sciences is an example solution that depends on it.

All packs use one `SuperHarnessPack` manifest. `category` distinguishes `capability`, `adapter`, `domain`, `asset`, `governance`, and `solution` packs without creating incompatible plugin systems.

## Runtime Flow

1. The model calls `superharness_pack_list` and `superharness_pack_describe` to select applicable content.
2. The caller supplies opaque resource ids and their resource types to `superharness_pack_validate`. Required packs, capabilities, adapter compatibility, and slot bindings must pass before use.
3. The model reads an explicit asset with `superharness_pack_asset_read`. Arbitrary pack filesystem access is unavailable.
4. The model invokes the adapter's existing MCP tool against the selected customer resource. Adapter authorization and approvals remain authoritative.

Pack validation does not grant access. It proves composition readiness; the connected target still enforces identity, policy, and resource authorization.

## Profiles and Packs

The shipped `hyperlake` profile composes the base web Harness, the SuperHarness registry, the Data Engineering capability, its Capability Library UI, and the Hyperlake adapter. The Settings library reports first-party outcomes and resource availability without exposing credentials or duplicating Rails state. Set `SUPERHARNESS_HYPERLAKE_DISABLED=1` to inspect or boot the profile without starting the CLI MCP process.

## Upstream compatibility

Test the latest DeepSeek Harness merge without changing the current branch:

```sh
pnpm run upgrade:upstream:check
```

The command fetches `upstream/master`, creates a disposable detached worktree, merges the upstream commit there, installs the frozen lockfile, checks workspace constraints and types, runs the Hyperlake integration suite, builds the client and production Web application, and composes the keyless Hyperlake profile. Add `-- --full` to run the complete repository gate suite as well.

After the isolated check passes, apply that exact tested upstream commit to the clean current branch:

```sh
pnpm run upgrade:upstream:apply
```

Neither mode pushes, publishes, or changes registry state. The apply mode refuses a non-`HEAD` base, a dirty worktree, or a branch whose HEAD changes while verification is running.

Additional pack bundles remain explicit profile plugins. This keeps tenant-selected accelerator content separate from the base install and allows the same capability pack to run through different adapters.

## Future Rails Agent Mapping

No Rails Agent or Hyperlake CLI APIs are changed here. A future Rails Agent manifest can refer to a pack by `id`, `version`, and immutable package digest, then carry its resource bindings. The compiled local profile installs those pack plugins and passes only opaque resource references to the unchanged MCP tools.

That mapping gives an Agent a governed registry context without forcing execution through a Rails conversation. Users may invoke the same mounted tools directly from this Harness, Claude Code, OpenCode, or any MCP-compatible client.

## Boundaries

- Installation is explicit; the registry reports missing dependencies but does not install packages.
- Adapter metadata is not a health check for its external MCP process.
- Engine-specific assets are never silently translated. The example Spark SQL asset is marked Databricks-only.
- The included Life Sciences assets are illustrative, original examples and are not validated clinical standards.
