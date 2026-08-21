# `@cerebrixos/superharness-adapter-hyperlake`

[English](README.md) | 中文

此可安装组合包启动未经修改的 `hyperlake mcp serve --stdio` 命令，并通过 Harness MCP 客户端注册其发现的工具。发布的可执行程序会解析其精确的 `@cerebrixos/hyperlake` 依赖；`SUPERHARNESS_HYPERLAKE_COMMAND` 可显式覆盖该程序，`SUPERHARNESS_HYPERLAKE_DISABLED=1` 可禁用进程。

凭据仍保存在现有 Hyperlake CLI 配置中，MCP 客户端会从派生进程的继承环境中清除凭据。适配器的能力包清单不存储任何凭据值。

适配器还通过同一个已安装 CLI 及其现有登录提供类型化资源发现。能力资源槽可以发现 Hyperlake 集群、SaaS Lake 数据环境、已部署 Agent、语义模型项目、受治理服务和监控器。发现结果只返回展示元数据和不透明 ID；选择资源不会把端点、JWT 或凭据复制到能力清单中。目录和查询操作继续通过所选集群的受治理 MCP 工具完成，不会创建第二条直接连接路径。

全部 `mcp__hyperlake__` 工具会注册为一个不可移除的安装级附件。它们保持为共享平台能力，而所选能力及其资源绑定为模型提供应使用哪个已授权目标的上下文。

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
