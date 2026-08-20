# `@cerebrixos/superharness-ui-capability-library`

English | [中文](README.zh.md)

First-party Plugins and Capability Library for the SuperHarness web interface. Plugins is the first Settings tab and installs optional npm, Git, private-SSH, or absolute local-path plugins into the local profile with explicit confirmation. Capabilities presents outcome-level composition without promoting implementation engines into product concepts.

Core Harness tools are available everywhere. Installed plugins supply optional tools, resource providers, assets, evaluations, and outcomes. Users can edit capability outcomes, discover and attach governed resources, attach exported assets or evaluations, and assign optional tools globally or to one capability. Private credentials remain in npm configuration, an SSH agent, or the provider's own secure configuration. A restart activates package changes; no Rails service or duplicate Host API is involved.

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
