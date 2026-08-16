# Hyperlake SuperHarness

[English](README.md) | 中文

Hyperlake SuperHarness 是一个用于受治理的基础设施与数据工作的本地 AI 运行框架。它把 Hyperlake CLI 的 MCP 工具挂载到可组合运行时中，支持对话、审批、目标、作业、技能、能力包和行业解决方案包。

## 运行

```sh
npx @cerebrixos/hyperlake-superharness
```

默认的 `hyperlake` 配置会启动本地 Web 体验和随包提供的 Hyperlake MCP 服务。该软件包精确依赖指定版本的 `@cerebrixos/hyperlake`，因此不会依赖任意的全局可执行文件。

现有 Hyperlake 身份验证信息仍保存在 CLI 的安全本地配置中。能力包清单只携带不透明的资源引用和要求，不包含客户凭据。

如需在不启动 MCP 的情况下检查配置，请设置 `SUPERHARNESS_HYPERLAKE_DISABLED=1`：

```sh
SUPERHARNESS_HYPERLAKE_DISABLED=1 npx @cerebrixos/hyperlake-superharness --dump-default-config
```

通过显式配置可使用底层 Harness 配置：

```sh
npx @cerebrixos/hyperlake-superharness --profile headless "inspect platform health"
```

## 能力包

内置的数据工程能力包提供确定性流程、技能、评估和资产。能力包声明所需能力和类型化资源槽位，适配器则暴露现有的受治理工具接口。内置生命科学软件包展示了领域解决方案如何组合横向能力，同时不会直接获得凭据或代码仓库访问权限。

能力包验证只证明组合已准备就绪；授权、策略检查和审批仍由连接的 Hyperlake 资源最终执行。
