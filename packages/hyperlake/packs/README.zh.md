# `@cerebrixos/superharness-packs`

[English](README.md) | 中文

此包是 Hyperlake SuperHarness 的可移植能力包注册表。能力包既是可安装的 DeepSeek/Cordis 组合插件，也是包含 `hyperlake-pack.yaml` 的目录。统一清单支持能力、适配器、领域、资产、治理和解决方案类别，无需创建互不兼容的格式。

能力包资产必须显式导出。`superharness_pack_list`、`superharness_pack_describe`、`superharness_pack_validate` 和 `superharness_pack_asset_read` 让模型能够确定性地发现、验证并读取 DDL、SQL、dbt、notebook、语义模型、仪表板、流程、目标、评估和参考资料。验证通过检查依赖、适配器能力和类型化客户资源绑定，将安装与激活分离。资产路径受限于规范能力包根目录，并包含符号链接解析和可配置的读取字节上限。

注册表不存储凭据，也不执行目标操作。适配器插件把能力包要求连接到 Hyperlake 或客户自有工具。

## 模型体验

### 能力包目录与资产

#### 模型可见内容

从 `superharness_pack_list` 到 `superharness_pack_asset_read` 的四个稳定工具，用于选择并读取显式导出的能力包资产。已安装内容仅出现在工具结果中。

#### Token 影响

工具定义固定；所选清单和资产内容仅在调用后追加。

#### KV Cache 影响

四个工具 schema 保持前缀稳定。能力包说明和资产内容只在显式工具调用后进入上下文并追加到会话历史。

## 已知限制与后续工作

- 能力包安装保持显式。验证会报告缺少的依赖，但不会自动安装。
- 资产执行委托给适配器工具；注册表不翻译 Spark SQL、notebook 或引擎专用 DDL。
