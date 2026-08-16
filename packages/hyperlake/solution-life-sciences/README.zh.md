# `@cerebrixos/superharness-solution-life-sciences`

[English](README.md) | 中文

此示例解决方案组合包展示了如何将 Databricks 风格的行业加速器组装为原生 SuperHarness 插件。它依赖可复用的数据工程包，接受 Hyperlake 或 Databricks 执行可移植操作，并将 Spark SQL/Delta DDL 明确标记为仅限 Databricks，而不会静默翻译。

所含模型是此仓库的原创说明性示例。它不复制 Databricks industry-solutions 仓库，也不是经过验证的临床标准。

## 模型体验

### 生命科学指南与资产

#### 模型可见内容

简洁的来源与方言安全提示段、一份解决方案说明，以及仅在调用 `superharness_pack_asset_read` 后返回的模型、流程或评估原始内容。

#### Token 影响

提示段固定；说明和资产内容通过显式工具结果追加。

#### KV Cache 影响

指南是稳定的提示段。资产内容只在显式读取后进入历史。

## 已知限制与后续工作

- 所含资产仅用于说明，不是经过验证的临床标准。
