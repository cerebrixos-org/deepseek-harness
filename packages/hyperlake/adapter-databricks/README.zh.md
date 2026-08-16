# `@cerebrixos/superharness-adapter-databricks`

[English](README.md) | 中文

此组合包将 Databricks 注册为兼容的 SuperHarness 适配器，并可选择启动客户指定的 MCP 服务。设置 `SUPERHARNESS_DATABRICKS_MCP_COMMAND` 可启用执行，并通过 `SUPERHARNESS_DATABRICKS_MCP_ARGS` 提供 JSON 参数数组。

此包不指定第三方 Databricks MCP 实现，也不携带工作区 URL 或凭据；这些信息保留在客户本地。未来可在相同能力 ID 后以原生 Databricks 支持替换 MCP 提供方。

## 模型体验

### Databricks MCP 接口

#### 模型可见内容

配置后，模型可见 `mcp__databricks__` 下的客户 Databricks MCP 工具，以及适配器的能力包目录说明。

#### Token 影响

工具定义占用请求前缀；参数和结果仅在调用时追加。

#### KV Cache 影响

客户选择的服务保持工具集不变时，MCP schema 前缀保持稳定。

## 已知限制与后续工作

- 客户必须选择并配置 MCP 实现；此包不对具体实现进行认证。
