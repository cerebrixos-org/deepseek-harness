# `@cerebrixos/superharness-ui-capability-library`

[English](README.md) | 中文

SuperHarness Web 界面的只读第一方能力库。它展示结果层能力及其已配置、已启用或可连接的资源，不会把实现引擎提升为产品概念。当前 Loader 清单提供实时启用状态和健康信息，不涉及 Rails 服务或重复的 Host API。

## 模型体验

### 能力库界面

#### 模型可见内容

无。此包在浏览器设置中呈现本地部署状态，不提供提示、工具、消息或提供方请求。其 `settings.plugins.tab` 注册完全在客户端执行。

#### Token 影响

无；此包不组装模型输入。

#### KV Cache 影响

无；此包既不组装也不发送模型输入。

## 已知限制与后续工作

- 资源行报告提供方可用性和支持的可选绑定；持久绑定配置和安装操作留待后续实现。
