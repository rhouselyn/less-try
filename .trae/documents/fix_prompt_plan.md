# 修复提示词和单词选项问题的计划

## 问题分析

用户反馈在做题时，单词选项中包含了单词在句子中的上下文意思，而用户希望只需要单词的基本意思，不需要上下文信息。

## 代码结构分析

1. **vocab.json**：存储在 `/workspace/data/files/{file_id}/vocab.json` 中，包含单词的基本信息，如 `word`、`context_meaning`、`morphology` 等。

2. **context**：在 `main.py` 中，`context` 是通过从 `pipeline_data` 中查找包含该单词的句子来构建的，用于提供上下文信息。

3. **generate_multiple_choice**：在 `nvidia_api.py` 中，该函数接受 `word`、`correct_meaning`、`context` 和 `target_lang` 作为参数，生成包含多个选项的单词信息。

## 修复计划

### 1. 修改 `main.py` 中的 `get_random_word` 函数
- 移除构建 `context` 的代码
- 直接使用 `vocab` 中的 `context_meaning` 作为 `correct_meaning`
- 调用 `nvidia_api.generate_multiple_choice` 时不传递 `context` 参数

### 2. 修改 `nvidia_api.py` 中的 `generate_multiple_choice` 函数
- 修改函数签名，将 `context` 参数设为可选
- 修改 prompt，移除上下文相关的内容
- 确保生成的选项只包含单词的基本意思，不包含上下文信息

### 3. 修改 `pre_generate_next_word` 函数
- 同样移除构建 `context` 的代码
- 调用 `nvidia_api.generate_multiple_choice` 时不传递 `context` 参数

### 4. 修改 `get_word_details` 函数
- 移除构建 `context` 的代码
- 调用 `nvidia_api.generate_multiple_choice` 时不传递 `context` 参数

## 预期效果

修改后，做题时单词选项将只包含单词的基本意思，不包含上下文信息，符合用户的需求。

## 风险评估

- **风险**：移除上下文信息可能会影响生成的例句质量
- **缓解措施**：保留例句生成功能，但使用单词的基本意思而不是上下文意思
- **风险**：可能会影响记忆辅助的质量
- **缓解措施**：记忆辅助可以基于单词的基本意思生成，不一定需要上下文

## 测试计划

1. 输入文本，生成单词表
2. 进入学习模式，测试单词选项是否只包含基本意思
3. 点击下一题，测试是否能正常切换到下一个单词
4. 检查生成的例句和记忆辅助是否仍然合理