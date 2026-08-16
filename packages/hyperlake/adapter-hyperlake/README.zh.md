# `@cerebrixos/superharness-adapter-hyperlake`

[English](README.md) | 中文

此可安装组合包启动未经修改的 `hyperlake mcp serve --stdio` 命令，并通过 Harness MCP 客户端注册其发现的工具。发布的可执行程序会解析其精确的 `@cerebrixos/hyperlake` 依赖；`SUPERHARNESS_HYPERLAKE_COMMAND` 可显式覆盖该程序，`SUPERHARNESS_HYPERLAKE_DISABLED=1` 可禁用进程。

凭据仍保存在现有 Hyperlake CLI 配置中，MCP 客户端会从派生进程的继承环境中清除凭据。适配器的能力包清单不存储任何凭据值。

## 模型体验

### Hyperlake MCP 接口

#### 模型可见内容

已安装 Hyperlake CLI 在 `mcp__hyperlake__` 下发布的工具，以及适配器的能力包目录说明。

#### Token 影响

工具定义占用请求前缀；参数和结果仅在调用时追加。

#### KV Cache 影响

已安装 CLI 保持工具集不变时，MCP 工具 schema 前缀保持稳定。

## 已知限制与后续工作

- 运行时健康由 MCP 客户端负责；能力包验证只证明元数据兼容性，不证明实时集群连通性。
