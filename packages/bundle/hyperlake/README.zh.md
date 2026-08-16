# `@cerebrixos/superharness-base`

[English](README.md) | 中文

此组合包向 DeepSeek Harness 配置添加可移植的 Hyperlake 能力包注册表、数据工程能力和只读能力库。它不存储凭据。配置层还会添加 Hyperlake 适配器，以提供对客户资源的受治理访问。

## 模型体验

### 能力组合

#### 模型可见内容

由 `@cerebrixos/superharness-packs` 提供的固定发现、验证和资产工具，以及简洁的数据工程操作指南。能力库本身不提供模型输入。

#### Token 影响

数据工程提示会添加一小段固定前缀。后续工具调用和结果会根据数据量增加 token。

#### KV Cache 影响

此组合包会添加注册表的固定工具 schema 和稳定的数据工程指南。

## 已知限制与后续工作

- 能力库报告当前提供方的可用性；资源绑定和安装操作有意留待后续实现。
