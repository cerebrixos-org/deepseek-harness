# Hyperlake SuperHarness

English | [中文](README.zh.md)

Hyperlake SuperHarness is a local AI harness for governed infrastructure and data work. It mounts the Hyperlake CLI's MCP tools into a composable runtime for conversations, approvals, goals, jobs, skills, capability packs, and industry solution packs.

## Run

```sh
npx @cerebrixos/hyperlake-superharness
```

The default `hyperlake` profile starts the local web experience and the bundled Hyperlake MCP server. The package depends on an exact `@cerebrixos/hyperlake` release, so it does not depend on an arbitrary global executable.

Existing Hyperlake authentication remains in the CLI's filesystem-protected local configuration. Pack manifests carry opaque resource references and requirements; they do not contain customer credentials.

## Authenticate Hyperlake

The SuperHarness package includes an exact Hyperlake CLI/MCP dependency; no global CLI installation is required. Authentication is a separate one-time action for each operating-system user, and the bundled MCP subprocess reuses that user's session.

1. Obtain the Hyperlake tenant URL, your account email, and either an API key or OAuth access token.
2. Have a password manager or another trusted secret injector set one of these environment variables. Do not type the value into a conversation, capability manifest, routine input, or MCP argument.

```sh
# Set exactly one through your secret manager:
HYPERLAKE_API_KEY="..."
HYPERLAKE_ACCESS_TOKEN="..."
```

In PowerShell, the corresponding references are `$env:HYPERLAKE_API_KEY` and `$env:HYPERLAKE_ACCESS_TOKEN`.

3. Store a persistent CLI login with the API key:

```sh
npx @cerebrixos/hyperlake@0.2.4 auth login \
  --host https://your-hyperlake.example.com \
  --email you@example.com \
  --api-key "$HYPERLAKE_API_KEY"
```

Or store an OAuth access token:

```sh
npx @cerebrixos/hyperlake@0.2.4 auth login \
  --host https://your-hyperlake.example.com \
  --email you@example.com \
  --access-token "$HYPERLAKE_ACCESS_TOKEN"
```

The current CLI stores this login in the user's Hyperlake configuration file with `0600` permissions. Supplying a literal secret directly on the command line may expose it through shell history, which is why the examples read it from an injected environment variable.

4. Verify the control-plane identity before starting the Harness:

```sh
npx @cerebrixos/hyperlake@0.2.4 auth whoami
```

5. Start the complete local experience:

```sh
npx @cerebrixos/hyperlake-superharness
```

6. In the local Web UI, configure a supported model provider. Model-provider credentials and Hyperlake credentials are separate.
7. Open **Settings → Plugins** to install optional npm, Git, private-SSH, or absolute local-path plugins. Confirm the source and restart after installation.
8. Open **Settings → Capabilities**, create or enable a capability, edit its outcomes, discover its governed resources, and attach contributions exported by installed plugins.
9. Select the capability before the session's first message and ask for direct governed work, for example: `Inspect the available governed datasets and query sales totals for the last 30 days.`
10. For bounded autonomous work, ask: `Activate the maintain-data-freshness goal and stop only after its success criteria are verified.` or `Run the build-silver-layer routine for source raw.orders and target silver.orders.`

The laptop calls the Hyperlake control plane and authorized cluster endpoints through the bundled CLI/MCP process. Pack selection does not copy customer data or credentials into the SuperHarness registry, and target operations still enforce Hyperlake identity, policy, and approval checks.

Set `SUPERHARNESS_HYPERLAKE_DISABLED=1` to inspect the profile without starting MCP:

```sh
SUPERHARNESS_HYPERLAKE_DISABLED=1 npx @cerebrixos/hyperlake-superharness --dump-default-config
```

## Profiles

Use an explicit profile to access the underlying Harness profiles:

```sh
npx @cerebrixos/hyperlake-superharness --profile headless "inspect platform health"
```

## Plugins and Capabilities

Core Harness tools are available to every capability. Plugins are the supply layer for optional tools, resource providers, assets, evaluations, and outcomes. Install a plugin in **Settings → Plugins**, or use the equivalent CLI command:

```sh
npx @cerebrixos/hyperlake-superharness plugin --profile hyperlake add <npm-package-or-git-source>
```

For a private package, authenticate through the user's npm configuration. For a private Git repository, use an SSH URL and the user's SSH agent. Never embed a token in a URL. A restart is required after install or removal so the profile can load the changed bundle.

The Plugins page inventories only installed contributions. A capability may then compose those contributions: outcomes are editable; governed resources are discovered through an installed provider and stored by opaque id; assets and evaluations retain immutable source-plugin provenance; optional tools can be shared across capabilities or scoped to one capability. Base Harness tools are not duplicated in capability configuration.

## Capability Packs

The included Data Engineering pack provides deterministic routines, skills, evaluations, and assets. Packs declare required capabilities and typed resource slots, while adapters expose existing governed tool surfaces. The included Life Sciences package demonstrates how a domain solution composes the horizontal capability without receiving direct access to credentials or repositories.

Pack validation proves composition readiness; authorization, policy checks, and approvals remain authoritative at the connected Hyperlake resource.

After selecting and binding a capability, use its attached tools directly for interactive work. For bounded autonomous work, ask the Harness to activate an exported goal or run an exported routine. `superharness_goal_activate` delegates success criteria and observations to the native same-session goal driver; `superharness_routine_run` delegates ordered steps and limits. Both are capped by deployment policy, accept only non-secret inputs, and retain each governed tool's approval requirements for mutations.

Goals and routines are capability assets, not background permissions. The capability must be selected for the current session and all required resource slots must be bound before either tool starts.
