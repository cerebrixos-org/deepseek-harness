# `@cerebrixos/superharness-adapter-hyperlake`

English | [中文](README.zh.md)

This installable bundle starts the unchanged `hyperlake mcp serve --stdio` command and registers its discovered tools through the Harness MCP client. The published executable resolves its exact `@cerebrixos/hyperlake` dependency; `SUPERHARNESS_HYPERLAKE_COMMAND` can explicitly override that executable, and `SUPERHARNESS_HYPERLAKE_DISABLED=1` disables the process.

Credentials remain in the existing Hyperlake CLI configuration and are scrubbed from the spawned process's inherited environment by the MCP client. The adapter stores no credential values in its pack manifest.

The adapter also exposes typed resource discovery backed by the same installed CLI and its existing login. Capability slots can discover Hyperlake clusters, SaaS Lake data environments, deployed agents, semantic-model projects, governed services, and monitors. Discovery returns display metadata and opaque ids only; the selected resource does not copy endpoints, JWTs, or credentials into the capability manifest. Catalog and query operations continue through the selected cluster's governed MCP tools instead of creating a second direct connection path.

All `mcp__hyperlake__` tools are registered as one non-removable installation attachment. They remain shared platform capabilities, while a selected capability and its resource bindings supply the context that tells the model which authorized target to use.

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
