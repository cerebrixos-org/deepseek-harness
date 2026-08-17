# Hyperlake SuperHarness

[English](README.md) | 中文

Hyperlake SuperHarness 是一个用于受治理的基础设施与数据工作的本地 AI 运行框架。它把 Hyperlake CLI 的 MCP 工具挂载到可组合运行时中，支持对话、审批、目标、作业、技能、能力包和行业解决方案包。

## 运行

```sh
npx @cerebrixos/hyperlake-superharness
```

默认的 `hyperlake` 配置会启动本地 Web 体验和随包提供的 Hyperlake MCP 服务。该软件包精确依赖指定版本的 `@cerebrixos/hyperlake`，因此不会依赖任意的全局可执行文件。

现有 Hyperlake 身份验证信息仍保存在受文件系统保护的 CLI 本地配置中。能力包清单只携带不透明的资源引用和要求，不包含客户凭据。

## Hyperlake 身份验证

SuperHarness 软件包精确包含 Hyperlake CLI/MCP 依赖，无需全局安装 CLI。每个操作系统用户只需单独完成一次身份验证，随包启动的 MCP 子进程会复用该用户的会话。

1. 获取 Hyperlake 租户 URL、账户邮箱，以及 API 密钥或 OAuth 访问令牌。
2. 通过密码管理器或其他可信秘密注入器设置以下环境变量之一。不要把秘密值输入对话、能力包清单、流程输入或 MCP 参数。

```sh
# Set exactly one through your secret manager:
HYPERLAKE_API_KEY="..."
HYPERLAKE_ACCESS_TOKEN="..."
```

在 PowerShell 中，对应的引用是 `$env:HYPERLAKE_API_KEY` 和 `$env:HYPERLAKE_ACCESS_TOKEN`。

3. 使用 API 密钥保存持久 CLI 登录：

```sh
npx @cerebrixos/hyperlake@0.2.1 auth login \
  --host https://your-hyperlake.example.com \
  --email you@example.com \
  --api-key "$HYPERLAKE_API_KEY"
```

或者保存 OAuth 访问令牌：

```sh
npx @cerebrixos/hyperlake@0.2.1 auth login \
  --host https://your-hyperlake.example.com \
  --email you@example.com \
  --access-token "$HYPERLAKE_ACCESS_TOKEN"
```

当前 CLI 会以 `0600` 权限把该登录保存在用户的 Hyperlake 配置文件中。直接在命令行提供字面秘密可能被 shell 历史记录，因此示例从注入的环境变量读取秘密。

4. 启动 Harness 前验证控制平面身份：

```sh
npx @cerebrixos/hyperlake@0.2.1 auth whoami
```

5. 启动完整的本地体验：

```sh
npx @cerebrixos/hyperlake-superharness
```

6. 在本地 Web 界面中配置受支持的模型提供方。模型提供方凭据与 Hyperlake 凭据相互独立。
7. 打开 **设置 → 能力**，启用能力，并使用不透明资源 id 绑定所有必需资源槽位。
8. 在会话第一条消息之前选择能力。
9. 可直接请求受治理的工作，例如：`检查可用的受治理数据集，并查询过去 30 天的销售总额。`
10. 对于有边界的自主工作，可以请求：`激活 maintain-data-freshness 目标，且仅在成功标准验证后停止。` 或 `为源 raw.orders 和目标 silver.orders 运行 build-silver-layer 流程。`

笔记本电脑通过随包提供的 CLI/MCP 进程直接调用 Hyperlake 控制平面和已授权集群端点。选择能力不会把客户数据或凭据复制到 SuperHarness 注册表中，目标操作仍会执行 Hyperlake 身份、策略和审批检查。

如需在不启动 MCP 的情况下检查配置，请设置 `SUPERHARNESS_HYPERLAKE_DISABLED=1`：

```sh
SUPERHARNESS_HYPERLAKE_DISABLED=1 npx @cerebrixos/hyperlake-superharness --dump-default-config
```

## 配置

通过显式配置可使用底层 Harness 配置：

```sh
npx @cerebrixos/hyperlake-superharness --profile headless "inspect platform health"
```

## 能力包

内置的数据工程能力包提供确定性流程、技能、评估和资产。能力包声明所需能力和类型化资源槽位，适配器则暴露现有的受治理工具接口。内置生命科学软件包展示了领域解决方案如何组合横向能力，同时不会直接获得凭据或代码仓库访问权限。

能力包验证只证明组合已准备就绪；授权、策略检查和审批仍由连接的 Hyperlake 资源最终执行。

选择并绑定能力后，可以直接使用其附加工具完成交互式工作。对于有边界的自主工作，可以要求 Harness 激活已导出的目标或运行已导出的流程。`superharness_goal_activate` 会把成功标准和观测契约委托给同一会话中的原生目标驱动器；`superharness_routine_run` 会委托有序步骤和限制。两者都受部署策略的轮次上限约束，只接受非秘密输入，并保留各个受治理工具对变更操作的审批要求。

目标和流程是能力资产，而不是后台权限。启动任一工具之前，必须为当前会话选择该能力，并绑定所有必需的资源槽位。
