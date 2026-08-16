# `@cerebrixos/superharness-adapter-databricks`

English | [中文](README.zh.md)

This bundle registers Databricks as a compatible SuperHarness adapter and optionally starts a customer-selected MCP server. Set `SUPERHARNESS_DATABRICKS_MCP_COMMAND` to enable execution and provide a JSON argument array through `SUPERHARNESS_DATABRICKS_MCP_ARGS`.

The package does not choose a third-party Databricks MCP implementation and carries no workspace URL or credential. Those remain customer-local. Native Databricks support can later replace the MCP provider behind the same capability ids.

## Model Experience

### Databricks MCP surface

#### What the model sees

When configured, the customer's Databricks MCP tools under `mcp__databricks__`, plus the adapter's pack-catalog description.

#### Token effect

Tool definitions occupy the request prefix; arguments and results append only when invoked.

#### KV Cache effect

The MCP schema prefix remains stable while the customer-selected server publishes an unchanged tool set.

## Known Limitations and Deferred Work

- The customer must select and configure an MCP implementation; this package does not certify one.
