# 少邻国 (Lesslingo) - 交互逻辑重构计划

## 1. 需求分析

### 用户要求
1. **split_and_translate 工具功能**：
   - 分词以及形态以及每个词对应的中文意思，方便字典显示
   - 分词后的译文（例如：你好，我是人类。分成：你好 我 是 人类）
   - 句子语法讲解

2. **字典显示逻辑**：
   - 只需要 split_and_translate 中的分词以及形态以及每个词对应的中文意思

3. **语言规定**：
   - 根据所选择的目标语言规定翻译后的语言
   - 用目标语言来进行语法讲解

### 现有代码分析
1. **nvidia_api.py**：
   - 现有的 split_and_translate 工具已经实现了分词、翻译、音标和形态信息的提取
   - 但翻译输出格式可能需要调整，以符合用户要求的分词后译文格式

2. **main.py**：
   - 现有的 process-text API 已经从 split_and_translate 结果中提取词汇并去重
   - 但需要确保只使用 split_and_translate 的数据来构建字典

3. **text_processor.py**：
   - 现有的 split_and_translate 方法已经调用了 nvidia_api 的 split_and_translate 方法
   - 但可能需要调整处理逻辑，以符合用户的要求

## 2. 实施计划

### 2.1 修改文件列表

| 文件路径 | 模块 | 主要修改内容 |
|---------|------|------------|
| `/workspace/backend/nvidia_api.py` | NvidiaAPI.split_and_translate | 调整 Tool Schema 和 prompt，确保翻译输出符合分词后格式，语法讲解使用目标语言 |
| `/workspace/backend/text_processor.py` | TextProcessor.split_and_translate | 确保正确处理和返回 split_and_translate 的结果 |
| `/workspace/backend/main.py` | process_text | 确保只使用 split_and_translate 的数据构建字典，不依赖其他数据源 |
| `/workspace/frontend/src/App.jsx` | 前端界面 | 调整前端显示逻辑，确保只显示 split_and_translate 中的分词、形态和翻译信息 |

### 2.2 详细修改步骤

#### 步骤 1：修改 nvidia_api.py 中的 split_and_translate 方法

1. **更新 Tool Schema**：
   - 确保 tokens 字段包含 text、translation、phonetic 和 morphology
   - 确保 translation 字段是分词后的译文格式
   - 确保 grammar_explanation 字段使用目标语言

2. **更新 prompt**：
   - 明确要求翻译输出为分词后的格式
   - 明确要求语法讲解使用目标语言
   - 确保分词不包含标点符号

#### 步骤 2：修改 text_processor.py 中的 split_and_translate 方法

1. **调整处理逻辑**：
   - 确保正确处理 nvidia_api 返回的结果
   - 确保过滤掉标点符号
   - 确保返回格式符合前端需求

#### 步骤 3：修改 main.py 中的 process_text 方法

1. **调整字典构建逻辑**：
   - 确保只使用 split_and_translate 的数据构建字典
   - 确保正确处理分词、形态和翻译信息
   - 确保根据目标语言设置翻译和讲解语言

#### 步骤 4：修改前端 App.jsx

1. **调整显示逻辑**：
   - 确保只显示 split_and_translate 中的分词、形态和翻译信息
   - 确保翻译显示为分词后的格式
   - 确保语法讲解显示正确

### 2.3 数据结构设计

#### split_and_translate 输出结构

```json
{
  "original": "Hello world.",
  "translation": [
    { "text": "Hello", "translation": "你好" },
    { "text": "world", "translation": "世界" }
  ],
  "tokens": [
    {
      "text": "Hello",
      "translation": "你好",
      "phonetic": "/həˈloʊ/",
      "morphology": "Interjection"
    },
    {
      "text": "world",
      "translation": "世界",
      "phonetic": "/wɜːrld/",
      "morphology": "Noun"
    }
  ],
  "grammar_explanation": "这是一个简单的问候语，由感叹词和名词组成。"
}
```

#### 字典条目结构

```json
{
  "word": "hello",
  "ipa": "/həˈloʊ/",
  "context_meaning": "你好",
  "morphology": "Interjection",
  "translation": "你好"
}
```

## 3. 潜在依赖和考虑事项

1. **API 响应格式**：
   - 需要确保 LLM API 能够返回符合要求的结构化数据
   - 需要处理 API 响应可能的变化

2. **语言支持**：
   - 需要确保支持用户选择的目标语言
   - 需要确保语法讲解能够使用目标语言

3. **前端显示**：
   - 需要确保前端能够正确显示分词后的译文
   - 需要确保前端能够正确显示形态和翻译信息

4. **性能考虑**：
   - 处理长文本时的性能问题
   - API 调用的响应时间

## 4. 风险处理

1. **API 调用失败**：
   - 实现错误处理和重试机制
   - 提供友好的错误提示

2. **数据格式不一致**：
   - 实现数据验证和规范化
   - 确保前端能够处理不同格式的数据

3. **语言支持限制**：
   - 明确支持的语言范围
   - 对不支持的语言提供合理的错误提示

## 5. 测试计划

1. **单元测试**：
   - 测试 split_and_translate 工具的输出格式
   - 测试字典构建逻辑

2. **集成测试**：
   - 测试 API 端到端流程
   - 测试前端与后端的交互

3. **用户测试**：
   - 测试不同语言的翻译和讲解
   - 测试长文本的处理

## 6. 预期结果

1. **功能实现**：
   - split_and_translate 工具能够正确分词并提供形态和翻译信息
   - 翻译输出为分词后的格式
   - 语法讲解使用目标语言

2. **用户体验**：
   - 前端能够清晰显示分词、形态和翻译信息
   - 字典显示符合用户要求
   - 交互流程流畅

3. **性能表现**：
   - API 响应时间合理
   - 处理长文本时性能稳定

## 7. 实施时间线

1. **阶段 1**：修改后端 API 实现（1-2 天）
   - 修改 nvidia_api.py
   - 修改 text_processor.py
   - 修改 main.py

2. **阶段 2**：修改前端实现（1 天）
   - 修改 App.jsx

3. **阶段 3**：测试和优化（1 天）
   - 进行单元测试和集成测试
   - 优化性能和用户体验

4. **阶段 4**：部署和验证（1 天）
   - 部署修改后的系统
   - 验证功能是否符合要求

## 8. 结论

本计划旨在通过修改现有的代码结构，实现用户要求的交互逻辑。通过调整 split_and_translate 工具的功能和字典显示逻辑，确保系统能够提供符合用户期望的分词、翻译和语法讲解功能。同时，通过合理的测试和优化，确保系统的性能和用户体验。