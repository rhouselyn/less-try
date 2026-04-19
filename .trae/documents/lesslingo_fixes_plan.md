# 少邻国 (Lesslingo) - 问题修复计划

## 问题分析

### 1. 音标显示不全
- **问题**：国际音标(IPA)符号显示不完整
- **原因**：可能是字体支持不够全面，或CSS设置有问题

### 2. 单词卡片缺少LLM生成的例句
- **问题**：单词卡片没有显示由LLM生成的例句
- **原因**：可能是前端没有正确解析或显示API返回的examples字段

### 3. 单词卡片缺少词形变化和记忆辅助
- **问题**：单词卡片没有显示词形变化和记忆辅助文字
- **原因**：可能是前端没有正确解析或显示API返回的variants_detail和memory_hint字段

## 解决方案

### 1. 音标显示修复
- **前端**：添加更全面的IPA字体支持，如Doulos SIL或Charis SIL
- **实现**：更新CSS字体声明，确保完整的IPA字符集支持

### 2. 例句显示修复
- **前端**：检查并修复LearningStep和WordDetail组件中examples字段的处理
- **实现**：确保从API响应中正确提取和显示例句

### 3. 词形变化和记忆辅助显示修复
- **前端**：检查并修复LearningStep和WordDetail组件中variants_detail和memory_hint字段的处理
- **实现**：确保从API响应中正确提取和显示这些字段

### 4. 后端验证
- **后端**：验证API是否正确返回所有字段
- **实现**：检查nvidia_api.py中的工具调用和响应处理

## 实施步骤

### 前端修改
1. **更新IPA字体支持**：修改index.css，添加更全面的IPA字体
2. **修复单词卡片组件**：更新LearningStep和WordDetail组件，确保正确显示所有字段
3. **测试显示效果**：验证所有信息都能正确显示

### 后端验证
1. **检查API响应**：验证generate_multiple_choice工具是否正确返回所有字段
2. **测试工具调用**：确保LLM正确生成例句、词形变化和记忆辅助

## 文件修改清单

### 前端文件
- [index.css](file:///workspace/frontend/src/index.css)：更新IPA字体支持
- [App.jsx](file:///workspace/frontend/src/App.jsx)：修复LearningStep和WordDetail组件

### 后端文件
- [nvidia_api.py](file:///workspace/backend/nvidia_api.py)：验证工具调用和响应处理
- [main.py](file:///workspace/backend/main.py)：验证API响应格式

## 风险评估

### 潜在风险
1. **字体加载问题**：添加新字体可能影响页面加载速度
2. **API响应格式**：后端可能没有正确返回所有字段
3. **前端解析**：前端可能无法正确解析复杂的JSON结构

### 风险缓解
1. **字体加载**：使用字体子集或异步加载
2. **API响应**：添加详细的日志和错误处理
3. **前端解析**：添加数据验证和默认值处理

## 预期结果

1. **完整的IPA显示**：所有音标符号都能正确显示
2. **例句显示**：单词卡片显示LLM生成的例句
3. **词形变化**：单词卡片显示单词的不同形式
4. **记忆辅助**：单词卡片显示记忆辅助文字
5. **用户体验**：所有信息清晰易读，符合Anthropic品牌指南
