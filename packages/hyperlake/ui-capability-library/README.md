# `@cerebrixos/superharness-ui-capability-library`

English | [中文](README.zh.md)

First-party Capability Library for the SuperHarness web interface. It is the first top-level Settings section and presents outcome-level capabilities without promoting implementation engines into product concepts. Users can create capabilities, configure resource bindings, attach installed provider tools, and choose whether each provider executes locally or through a platform-owned tool.

Shared providers are cross-cutting and become available in every selected capability. Capability-specific providers contribute only to one capability. The UI selects from the live tool registry; installing arbitrary packages remains an explicit administrator-controlled CLI action. The current Loader inventory supplies live enablement and health, and no Rails service or duplicate host API is involved.

## Model Experience

### Capability Library UI

#### What the model sees

Nothing directly. This package renders and mutates local deployment configuration through typed Remotes such as `ctx.hyperlakePacks.catalog()`. The Host pack registry owns model-visible prompts, tool filtering, and execution checks after a capability is selected.

#### Token effect

None; the package does not assemble model input.

#### KV Cache effect

None; the package neither assembles nor sends model input.

## Known Limitations and Deferred Work

- The UI attaches tools that are already installed in the runtime. New npm or local plugins are installed through the profile CLI before they appear here.
- Provider metadata never carries credentials; credentials remain in the provider's secure configuration path.
