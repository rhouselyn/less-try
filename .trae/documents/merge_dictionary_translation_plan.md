# 合并词典和翻译功能计划

## 1. 问题分析

### 1.1 主要任务
- 合并 `generate_dictionary` 和 `split_and_translate` 方法为一个 `process_text_with_dictionary` 方法
- 更新所有相关调用以使用新方法
- 修复句子翻译显示问题
- 修复单词表中例句显示问题

### 1.2 具体问题
- **显示问题**：当输入 "hi bro"，学习语言是中文，母语是日文时，单词表上面的句子翻译板块中还是显示的英文作为原文，而不是作为学习语言的中文
- **翻译题问题**：在某些情况下不会出现翻译题

## 2. 代码分析

### 2.1 后端代码
- `nvidia_api.py`：已实现 `process_text_with_dictionary` 方法，合并了原有的 `generate_dictionary` 和 `split_and_translate` 功能
- `text_processor.py`：已更新为使用新的 `process_text_with_dictionary` 方法
- `main.py`：已更新为使用新的响应结构，优先使用 `dictionary_entries` 字段

### 2.2 前端代码
- `DictionaryStep.jsx`：显示句子列表时，使用 `item.translation_result?.tokenized_translation || item.sentence` 作为主要文本
- `SentenceDetail.jsx`：原文本显示为 `translationResult?.tokenized_translation || translationResult?.original || sentence`，翻译显示为 `translationResult?.original || sentence`
- `WordDetail.jsx`：显示单词例句时，使用 `example.sentence` 和 `example.translation`

## 3. 解决方案

### 3.1 修复句子翻译显示问题
- 修改 `SentenceDetail.jsx`，交换原文本和翻译的显示顺序，确保目标语言翻译显示为主要文本

### 3.2 修复单词表中例句显示问题
- 检查 `generate_multiple_choice` 方法，确保例句使用正确的语言
- 确保 `process_text_with_dictionary` 方法生成的 `dictionary_entries` 中的例句使用正确的语言

### 3.3 确保翻译题生成
- 检查 `check_coverage` 方法，确保正确判断是否可以生成翻译题
- 检查 `generate_sentence_quiz` 方法，确保正确生成翻译题

## 4. 实施步骤

### 步骤 1：修复 SentenceDetail.jsx 中的显示问题
- 交换原文本和翻译的显示顺序
- 确保目标语言翻译显示为主要文本

### 步骤 2：验证 process_text_with_dictionary 方法
- 测试该方法是否正确生成 `dictionary_entries`
- 确保 `dictionary_entries` 中的例句使用正确的语言

### 步骤 3：验证翻译题生成
- 测试 `check_coverage` 方法
- 测试 `generate_sentence_quiz` 方法
- 确保在学习完足够单词后生成翻译题

### 步骤 4：运行应用并验证所有功能
- 启动后端服务器
- 启动前端应用
- 测试 "hi bro" 示例，确保显示正确
- 测试翻译题生成

## 5. 预期结果

- 句子翻译板块中显示目标语言翻译作为主要文本
- 单词表中的例句使用正确的语言
- 翻译题在学习完足够单词后正确生成
- 所有功能正常运行

## 6. 风险处理

- **API 调用失败**：添加错误处理，确保在 API 调用失败时提供合理的回退
- **数据结构不匹配**：添加类型检查，确保数据结构正确
- **性能问题**：确保合并后的方法不会显著增加响应时间
