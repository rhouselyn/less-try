# 少邻国 (Lesslingo) 修复计划

## 问题分析

### 1. Distractor Tokens 问题
- **现状**：当前distractor tokens生成的是组合词（如"嘿朋友"）
- **期望**：只需要单个的token，而不是组合词
- **原因**：NVIDIA API的prompt没有明确要求生成单个词的distractor tokens

### 2. 学习单元API 404错误
- **现状**：前端调用 `/api/learn/{file_id}/units` 时返回404错误
- **原因**：可能是存储中没有学习单元数据，或者API实现有问题

### 3. React Hooks 问题
- **现状**：用户提到需要将ProgressStep和SentenceTranslationStep组件移到App组件外部
- **原因**：React hooks不能在嵌套函数中使用

### 4. tokenized_translation_quoted 缺失
- **现状**：之前要求的tokenized_translation_quoted字段被移除了
- **期望**：需要重新添加这个字段

## 修复计划

### 1. 修复 Distractor Tokens 问题
- **文件**：`/workspace/backend/nvidia_api.py`
- **修改**：更新split_and_translate方法的prompt，明确要求生成单个词的distractor tokens
- **具体操作**：在prompt中添加明确的说明，要求distractor tokens必须是单个词，而不是组合词

### 2. 修复学习单元API 404错误
- **文件**：`/workspace/backend/main.py`
- **文件**：`/workspace/backend/storage.py`
- **修改**：
  1. 检查`load_learning_units`方法的实现
  2. 确保API端点正确处理不存在的学习单元情况
  3. 添加适当的错误处理和日志

### 3. 修复 React Hooks 问题
- **文件**：`/workspace/frontend/src/App.jsx`
- **修改**：检查App.jsx中是否有嵌套的组件定义，如果有，将它们移到外部
- **验证**：确保所有组件都在App组件外部定义，避免在嵌套函数中使用hooks

### 4. 添加 tokenized_translation_quoted 字段
- **文件**：`/workspace/backend/nvidia_api.py`
- **修改**：
  1. 在split_and_translate工具定义中添加`tokenized_translation_quoted`字段
  2. 在prompt中添加对该字段的说明，要求生成翻译后划分为单个单词的tokens

## 实施步骤

1. **第一步**：修改NVIDIA API的prompt和工具定义
   - 更新distractor tokens的要求
   - 添加tokenized_translation_quoted字段

2. **第二步**：检查和修复学习单元API
   - 检查storage.py中的load_learning_units方法
   - 确保main.py中的API端点正确处理各种情况

3. **第三步**：检查App.jsx的组件结构
   - 确保所有组件都在App组件外部定义
   - 验证没有在嵌套函数中使用hooks

4. **第四步**：测试修复效果
   - 启动后端和前端服务
   - 测试学习单元功能
   - 测试句子翻译功能，验证distractor tokens是否为单个词
   - 验证tokenized_translation_quoted字段是否存在

## 风险评估

- **API变更风险**：修改NVIDIA API的工具定义可能会影响现有的翻译结果
- **存储兼容性**：修改学习单元的存储结构可能会影响现有数据
- **前端兼容性**：修改组件结构可能会影响现有的前端逻辑

## 解决方案

- **API变更**：确保新的工具定义向后兼容，保留现有的字段
- **存储兼容性**：添加数据迁移逻辑，确保现有数据可以正常使用
- **前端兼容性**：确保组件的props接口保持不变，避免破坏现有功能