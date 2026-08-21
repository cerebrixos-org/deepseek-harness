# `@cerebrixos/superharness-ui-capability-library`

English | [中文](README.zh.md)

First-party Plugins and Capability Library for the SuperHarness web interface. Plugins is the first Settings tab and installs optional npm, Git, private-SSH, or absolute local-path plugins into the local profile with explicit confirmation. Capabilities presents outcome-level composition without promoting implementation engines into product concepts.

Core Harness tools are available everywhere. Installed plugins supply optional tools, resource providers, knowledge, workflows, evaluations, and outcomes. The capability view separates Overview, Outcomes, Resources, Tools, Knowledge & Assets, Workflows, Evaluations, Access, and Advanced configuration. Users bind each outcome to its expected inputs, resources, entry point, approval, and evaluations, then assign optional tools globally or to selected outcomes. A dbt, Prefect, or customer plugin follows this same local bundle contract; Hyperlake CLI/MCP remains the built-in governed adapter. Private credentials remain in npm configuration, an SSH agent, or the provider's own secure configuration. A restart activates package changes; no Rails service or duplicate Host API is involved.

Any number of capabilities may be configured and ready at once. A new conversation chooses one ready capability and outcome from the composer before its first message; that choice is durable and cannot silently change after work begins. An active conversation therefore has one explicit operating context, while other configured capabilities remain available to other conversations.

Resource setup is slot-led. For each required or optional slot, the UI shows only compatible installed providers, discovers resources the provider already authorizes, and attaches and binds the selected opaque resource in one action. The free-form resource editor remains only for additional context supplied by plugins that cannot discover resources. The UI also distinguishes universal core tools, non-removable shared tools supplied by the built-in Hyperlake adapter, capability-scoped tools, and installed tools that are not managed by a capability.

## Model Experience

### Capability Library UI

#### What the model sees

Nothing directly. This package renders and mutates local deployment configuration through typed Remotes such as `ctx.hyperlakePacks.catalog()`. The Host pack registry owns model-visible prompts, tool filtering, and execution checks after a capability is selected.

#### Token effect

None; the package does not assemble model input.

#### KV Cache effect

None; the package neither assembles nor sends model input.

## Known Limitations and Deferred Work

- Newly installed or removed plugins require a SuperHarness restart before their runtime contributions change.
- Provider metadata never carries credentials; credentials remain in the provider's secure configuration path.
