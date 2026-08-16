# `@hyperlake/superharness-adapter-hyperlake`

This installable bundle starts the unchanged `hyperlake mcp serve --stdio` command and registers its discovered tools through the Harness MCP client. `SUPERHARNESS_HYPERLAKE_COMMAND` overrides the executable, `SUPERHARNESS_HYPERLAKE_MODE` selects `analyst`, `builder`, or `admin`, and `SUPERHARNESS_HYPERLAKE_DISABLED=1` disables the process.

Credentials remain in the existing Hyperlake CLI configuration and are scrubbed from the spawned process's inherited environment by the MCP client. The adapter stores no credential values in its pack manifest.

## Model Experience

### Hyperlake MCP surface

#### What the model sees

The tools published by the installed Hyperlake CLI under `mcp__hyperlake__`, plus the adapter's pack-catalog description.

#### Token effect

Tool definitions occupy the request prefix; arguments and results append only when invoked.

#### KV Cache effect

The MCP tool schema prefix remains stable while the installed Hyperlake CLI publishes an unchanged tool set.

## Known Limitations and Deferred Work

- Runtime health belongs to the MCP client; pack validation proves metadata compatibility, not live cluster connectivity.
