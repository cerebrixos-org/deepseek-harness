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
4. For interactive work, the model invokes the adapter's existing MCP tool against the selected customer resource. Adapter authorization and approvals remain authoritative.
5. For bounded autonomous work, the model calls `superharness_goal_activate` or `superharness_routine_run`. Both delegate to the Harness's native same-session goal driver; they do not create a second agent loop.

An activated goal carries the pack's mandatory success criteria, observation contract, allowed remediation routines, and concrete resource bindings. A routine carries its ordered steps, limits, caller-supplied non-secret inputs, and bindings. The deployment-level `maxAutonomyRounds` setting is a hard ceiling. Pack selection does not bypass tool policy: mutations still require approval from the governed tool that performs them, and credentials remain external references rather than manifest or routine inputs.

Pack validation does not grant access. It proves composition readiness; the connected target still enforces identity, policy, and resource authorization.

## User Setup

1. Use a password manager or trusted environment injector to set `HYPERLAKE_API_KEY` or `HYPERLAKE_ACCESS_TOKEN`.
2. Run `npx @cerebrixos/hyperlake@0.2.1 auth login --host <tenant-url> --email <email> --api-key "$HYPERLAKE_API_KEY"`, substituting `--access-token "$HYPERLAKE_ACCESS_TOKEN"` when applicable.
3. Verify the session with `npx @cerebrixos/hyperlake@0.2.1 auth whoami`.
4. Start the bundled runtime with `npx @cerebrixos/hyperlake-superharness`.
5. Configure a model provider in the local Web UI; this credential is independent from Hyperlake authentication.
6. Open **Settings → Plugins**. Install any additional plugin from an npm package, Git URL, or absolute local path, then restart SuperHarness. Private sources use the user's existing npm configuration or SSH agent; credentials are never accepted in a source URL.
7. Open **Settings → Capabilities**. Create or enable a capability, then configure each outcome's inputs, required resources, tool or workflow entry point, approval, and evaluations. Attach Hyperlake or third-party tools such as a dbt bundle under **Tools**; core Harness tools are already available.
8. Select the capability before the first conversation turn, then use it interactively or request an exported goal/routine for bounded autonomous work.

The current Hyperlake CLI stores persistent control-plane credentials in its per-user configuration file with `0600` permissions. Literal secrets must not be placed in shell history, conversations, manifests, routine inputs, or MCP arguments. The planned stronger path is browser OAuth with PKCE and OS-keychain-backed refresh-token storage; until then, use a secret manager to inject the environment variable consumed by `auth login`.

## Profiles and Packs

The shipped `hyperlake` profile composes the base web Harness, the SuperHarness registry, the Data Engineering capability, its Capability Library UI, and the Hyperlake adapter. Plugin management is explicitly enabled only in this local profile. Core Harness tools are universal. Installed Cordis bundles supply additional typed tools, resource providers, knowledge, workflows, evaluations, and outcomes; capabilities map those contributions to outcomes and store only opaque resource ids. Outcome selection exposes global tools plus tools mapped to that outcome. Set `SUPERHARNESS_HYPERLAKE_DISABLED=1` to inspect or boot the profile without starting the CLI MCP process.

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

Additional pack bundles remain explicit profile plugins. Install them in **Settings → Plugins**, or use `hyperlake-superharness plugin --profile hyperlake add <package-or-git-source>`. A restart activates the new bundle. This keeps selected accelerator content separate from the base install and allows the same capability pack to run through different adapters.

## Future Rails Agent Mapping

No Rails Agent or Hyperlake CLI APIs are changed here. A future Rails Agent manifest can refer to a pack by `id`, `version`, and immutable package digest, then carry its resource bindings. The compiled local profile installs those pack plugins and passes only opaque resource references to the unchanged MCP tools.

That mapping gives an Agent a governed registry context without forcing execution through a Rails conversation. Users may invoke the same mounted tools directly from this Harness, Claude Code, OpenCode, or any MCP-compatible client.

## Boundaries

- Plugin installation mutates the local profile and therefore requires explicit confirmation. It is disabled unless the deployment enables `allowPluginManagement`.
- Adapter metadata is not a health check for its external MCP process.
- Engine-specific assets are never silently translated. The example Spark SQL asset is marked Databricks-only.
- The included Life Sciences assets are illustrative, original examples and are not validated clinical standards.
- Routine steps are a constrained autonomous execution contract, not a replacement for Temporal, Prefect, or another deterministic workflow engine. Packs can bind such an engine when exact durable orchestration is required.
