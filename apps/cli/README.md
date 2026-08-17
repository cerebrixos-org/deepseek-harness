# Hyperlake SuperHarness

English | [中文](README.zh.md)

Hyperlake SuperHarness is a local AI harness for governed infrastructure and data work. It mounts the Hyperlake CLI's MCP tools into a composable runtime for conversations, approvals, goals, jobs, skills, capability packs, and industry solution packs.

## Run

```sh
npx @cerebrixos/hyperlake-superharness
```

The default `hyperlake` profile starts the local web experience and the bundled Hyperlake MCP server. The package depends on an exact `@cerebrixos/hyperlake` release, so it does not depend on an arbitrary global executable.

Existing Hyperlake authentication remains in the CLI's secure local configuration. Pack manifests carry opaque resource references and requirements; they do not contain customer credentials.

Set `SUPERHARNESS_HYPERLAKE_DISABLED=1` to inspect the profile without starting MCP:

```sh
SUPERHARNESS_HYPERLAKE_DISABLED=1 npx @cerebrixos/hyperlake-superharness --dump-default-config
```

## Profiles

Use an explicit profile to access the underlying Harness profiles:

```sh
npx @cerebrixos/hyperlake-superharness --profile headless "inspect platform health"
```

## Capability Packs

The included Data Engineering pack provides deterministic routines, skills, evaluations, and assets. Packs declare required capabilities and typed resource slots, while adapters expose existing governed tool surfaces. The included Life Sciences package demonstrates how a domain solution composes the horizontal capability without receiving direct access to credentials or repositories.

Pack validation proves composition readiness; authorization, policy checks, and approvals remain authoritative at the connected Hyperlake resource.

After selecting and binding a capability, use its attached tools directly for interactive work. For bounded autonomous work, ask the Harness to activate an exported goal or run an exported routine. `superharness_goal_activate` delegates success criteria and observations to the native same-session goal driver; `superharness_routine_run` delegates ordered steps and limits. Both are capped by deployment policy, accept only non-secret inputs, and retain each governed tool's approval requirements for mutations.

Goals and routines are capability assets, not background permissions. The capability must be selected for the current session and all required resource slots must be bound before either tool starts.
