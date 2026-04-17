# 少邻国 (Lesslingo) - 核心功能重构 - 实施计划

## [ ] Task 1: 后端文本处理器重构 - 自动分句功能
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 增强 `text_processor.py`，实现基于标点符号的自动分句功能
  - 支持常见标点符号（句号、问号、感叹号等）的检测
  - 确保分句逻辑准确可靠
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-1.1: 输入包含多个句子的文本，系统能正确切分为多个句子
  - `programmatic` TR-1.2: 分句结果符合预期，无错误切分
- **Notes**: 分句逻辑应考虑中英文标点符号的差异

## [ ] Task 2: 后端词汇提取和去重功能优化
- **Priority**: P0
- **Depends On**: Task 1
- **Description**: 
  - 优化词汇提取逻辑，从每个句子中提取单词，排除标点符号
  - 实现全局词汇去重，只针对单词去重，取token翻译的并集作为释义集合
  - 实现音标处理：如果音标有不同（可能的生成错误），选出现最多的，一样多就选第一个
  - 保持词汇提取的准确性和效率
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `programmatic` TR-2.1: 输入包含重复单词的文本，提取的单词列表中每个单词只出现一次
  - `programmatic` TR-2.2: 词汇提取结果完整，无遗漏，不包含标点符号
  - `programmatic` TR-2.3: 去重时取token翻译的并集作为释义集合
  - `programmatic` TR-2.4: 音标处理正确，选择出现最多的音标
- **Notes**: 去重逻辑应考虑单词的大小写和形态变化

## [ ] Task 3: Tool Schema 设计与实现
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 设计并实现 `generate_dictionary` Tool Schema，用于答题时再现场生成
  - 设计 `split_and_translate` 输出结构，包含：
    - 分词结果（tokens）：每个token包含文字、对应翻译、音标、形态
    - 翻译结果：按token分词的翻译
    - 语法讲解：对整个句子的语法分析
  - 确保 LLM 能正确理解并返回符合 Schema 的数据
- **Acceptance Criteria Addressed**: AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-3.1: LLM 返回的数据符合 Tool Schema 定义
  - `programmatic` TR-3.2: `split_and_translate` 输出包含所有必要字段（分词、翻译、语法讲解）
  - `programmatic` TR-3.3: 单词的variants在变种前面需要说明类型（动词等）
- **Notes**: Schema 设计应清晰明确，便于 LLM 理解

## [ ] Task 4: 后端 API 调整
- **Priority**: P0
- **Depends On**: Task 1, Task 2, Task 3
- **Description**: 
  - 调整 `main.py` 中的 API 逻辑，整合新的文本处理和 Tool Call 功能
  - 确保 `split_and_translate` 输出格式符合前端需求，直接用于生成字典
  - 优化错误处理和日志记录
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-4.1: API 能正确处理文本并返回结构化数据
  - `programmatic` TR-4.2: `split_and_translate` 输出包含所有必要字段（分词、翻译、语法讲解）
  - `programmatic` TR-4.3: API 响应时间合理，无明显延迟
- **Notes**: 确保 API 接口向后兼容

## [ ] Task 5: 前端界面重构 - 双栏字典 UI
- **Priority**: P0
- **Depends On**: Task 4
- **Description**: 
  - 重构前端界面，实现双栏/卡片式字典 UI
  - 左侧显示单词列表（随机排列）
  - 右侧显示详细信息（音标、释义、例句等）
  - 直接使用 `split_and_translate` 的输出生成字典
  - 应用 Anthropic 风格的视觉设计
- **Acceptance Criteria Addressed**: AC-5, AC-6
- **Test Requirements**:
  - `human-judgment` TR-5.1: 界面布局清晰，双栏结构合理
  - `human-judgment` TR-5.2: 视觉设计符合 Anthropic 风格，简约现代
  - `programmatic` TR-5.3: 左侧单词点击后右侧显示对应详细信息
  - `programmatic` TR-5.4: 前端直接使用 `split_and_translate` 的输出生成字典
- **Notes**: 使用 Framer Motion 添加适当的动画效果

## [ ] Task 6: 前端流程优化 - 自动跳转功能
- **Priority**: P1
- **Depends On**: Task 5
- **Description**: 
  - 实现点击生成按钮后的自动跳转功能
  - 处理加载状态和错误情况
  - 确保跳转流程流畅自然
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `human-judgment` TR-6.1: 点击生成按钮后，处理完成自动跳转到单词表页面
  - `human-judgment` TR-6.2: 跳转过程中显示适当的加载状态
  - `programmatic` TR-6.3: 跳转功能在不同浏览器中正常工作
- **Notes**: 考虑添加过渡动画，提升用户体验

## [ ] Task 7: 前端设计优化 - 应用 Anthropic 品牌指南
- **Priority**: P1
- **Depends On**: Task 5
- **Description**: 
  - 应用 Anthropic 品牌指南，确保视觉设计一致性
  - 优化配色方案、排版和间距
  - 确保界面符合现代设计标准
- **Acceptance Criteria Addressed**: NFR-4, NFR-6
- **Test Requirements**:
  - `human-judgment` TR-7.1: 界面设计符合 Anthropic 品牌指南
  - `human-judgment` TR-7.2: 配色方案和谐，排版清晰
  - `human-judgment` TR-7.3: 间距合理，视觉层次分明
- **Notes**: 参考 Anthropic 官方设计文档

## [ ] Task 8: 前端交互优化 - 动画效果和过渡
- **Priority**: P1
- **Depends On**: Task 7
- **Description**: 
  - 使用 Framer Motion 添加流畅的动画效果
  - 优化页面过渡和交互反馈
  - 提升整体用户体验
- **Acceptance Criteria Addressed**: NFR-5
- **Test Requirements**:
  - `human-judgment` TR-8.1: 动画效果流畅自然
  - `human-judgment` TR-8.2: 交互反馈及时明确
  - `human-judgment` TR-8.3: 页面过渡平滑无卡顿
- **Notes**: 注意动画性能，避免过度使用影响性能

## [ ] Task 9: 系统测试与优化
- **Priority**: P1
- **Depends On**: All previous tasks
- **Description**: 
  - 进行端到端测试，验证所有功能正常工作
  - 优化系统性能和用户体验
  - 修复发现的问题和 bug
- **Acceptance Criteria Addressed**: All
- **Test Requirements**:
  - `programmatic` TR-9.1: 所有 API 端点正常响应
  - `human-judgment` TR-9.2: 整体用户体验流畅，无明显卡顿
  - `programmatic` TR-9.3: 系统能处理各种输入场景
- **Notes**: 测试时使用不同长度和复杂度的文本
