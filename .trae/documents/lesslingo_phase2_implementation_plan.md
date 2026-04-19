# 少邻国 (Lesslingo) - 阶段二实现计划

## 项目现状分析

### 前端
- **当前状态**：单一的 `App.jsx` 文件，包含所有组件和逻辑
- **主要功能**：文本输入、词汇生成、基础单词学习
- **问题**：文件过长（1171行），难以维护和扩展

### 后端
- **当前状态**：Python FastAPI 服务，集成 NVIDIA API
- **主要功能**：文本处理、词汇提取、多选项生成
- **问题**：缺少 10 词分组逻辑、缺少 CheckCoverage 算法、缺少句子翻译题目生成

## 阶段二目标

1. **前端重构**：将 `App.jsx` 拆分为多个模块化文件
2. **学习单元**：实现 10 词一组的学习单元
3. **进度页面**：创建进度显示页面，包含单元按钮
4. **动态循环**：实现 CheckCoverage 算法，检测已学单词是否可组成新句子
5. **翻译题目**：添加句子翻译题目，包含冗余 tokens
6. **API 调整**：修改 NVIDIA API 工具调用，生成 4 个冗余 tokens

## 实施计划

### 1. 前端重构

#### 1.1 目录结构调整
```
frontend/src/
├── App.jsx                 # 主应用组件
├── components/
│   ├── InputStep.jsx       # 输入步骤组件
│   ├── DictionaryStep.jsx  # 单词表步骤组件
│   ├── LearningStep.jsx    # 学习步骤组件
│   ├── WordDetail.jsx      # 单词详情组件
│   ├── SentenceDetail.jsx  # 句子详情组件
│   └── ProgressStep.jsx    # 进度显示组件（新增）
├── hooks/
│   └── useProcessing.js    # 处理状态钩子
├── utils/
│   ├── translations.js     # 翻译字典
│   └── api.js              # API 调用封装
└── contexts/
    └── LearningContext.js  # 学习状态上下文
```

#### 1.2 组件拆分
- **App.jsx**：保留路由逻辑和状态管理
- **InputStep.jsx**：独立的文本输入组件
- **DictionaryStep.jsx**：独立的单词表显示组件
- **LearningStep.jsx**：独立的学习组件
- **WordDetail.jsx**：独立的单词详情组件
- **SentenceDetail.jsx**：独立的句子详情组件
- **ProgressStep.jsx**：新增的进度显示组件

### 2. 后端功能扩展

#### 2.1 学习单元分组
- 修改 `process_text_background` 函数，实现 10 词一组的分组
- 为每个文件生成学习单元配置

#### 2.2 CheckCoverage 算法
- 实现 `check_coverage` 函数，检测已学单词是否可组成原文句子
- 算法逻辑：
  1. 获取已学单词集合
  2. 遍历原文句子
  3. 检查句子中的所有单词是否都在已学集合中
  4. 返回可组成的句子列表

#### 2.3 翻译题目生成
- 新增 `generate_translation_question` 函数
- 为每个句子生成 4 个冗余 tokens
- 实现翻译题目数据结构

#### 2.4 NVIDIA API 调整
- 修改 `split_and_translate` 工具定义，添加 `distractor_tokens` 字段
- 调整 prompt，要求生成 4 个合理的冗余 tokens

### 3. 学习流程实现

#### 3.1 进度页面
- 创建 `ProgressStep.jsx` 组件
- 显示学习单元列表，每个单元对应 10 个单词
- 已学习单元可点击重新学习，未学习单元禁用
- 自动滚动到最新进度

#### 3.2 动态学习循环
- 实现学习单元内的流程：
  1. 单词学习（10 词）
  2. CheckCoverage 检查
  3. 句子翻译题目（如果有可组成的句子）
  4. 单元完成

#### 3.3 翻译题目界面
- 显示原文句子
- 提供可点击的 tokens（包含冗余 tokens）
- 验证用户选择的翻译是否正确
- 错误时显示正确答案

### 4. 数据结构设计

#### 4.1 学习单元配置
```json
{
  "units": [
    {
      "unit_id": 1,
      "words": ["word1", "word2", ..., "word10"],
      "completed": false,
      "progress": 0
    },
    ...
  ],
  "current_unit": 1
}
```

#### 4.2 翻译题目数据
```json
{
  "sentence": "Original sentence",
  "correct_translation": "Correct translation",
  "tokens": ["token1", "token2", ...],
  "distractor_tokens": ["distractor1", "distractor2", "distractor3", "distractor4"]
}
```

### 5. 技术实现要点

#### 5.1 前端
- 使用 React Context 管理学习状态
- 实现平滑的页面过渡动画
- 优化 API 调用和状态更新

#### 5.2 后端
- 实现高效的 CheckCoverage 算法
- 优化 NVIDIA API 调用，避免限速
- 实现学习进度的持久化存储

### 6. 测试计划

#### 6.1 单元测试
- 测试 CheckCoverage 算法
- 测试学习单元分组逻辑
- 测试翻译题目生成

#### 6.2 集成测试
- 测试完整学习流程
- 测试前端与后端的交互
- 测试不同语言的处理

#### 6.3 用户测试
- 测试学习体验
- 测试界面响应性
- 测试错误处理

### 7. 风险评估

#### 7.1 潜在风险
- NVIDIA API 限速导致 TTS 生成失败
- 学习单元分组逻辑错误
- CheckCoverage 算法性能问题
- 前端状态管理复杂导致的 bug

#### 7.2 风险缓解
- 实现 TTS 调用间隔控制（1-2秒随机）
- 增加学习单元配置的验证
- 优化 CheckCoverage 算法，使用缓存
- 采用模块化的状态管理方案

### 8. 实施时间线

| 阶段 | 任务 | 预计时间 |
|------|------|----------|
| 1    | 前端重构 | 1-2 天 |
| 2    | 后端功能扩展 | 2-3 天 |
| 3    | 学习流程实现 | 2-3 天 |
| 4    | 测试与修复 | 1-2 天 |
| 5    | 优化与部署 | 1 天 |

## 预期成果

1. **模块化前端**：清晰的组件结构，易于维护和扩展
2. **完整的学习流程**：从单词学习到句子翻译的完整学习体验
3. **智能的动态循环**：基于已学单词自动生成合适的学习内容
4. **良好的用户体验**：流畅的界面和合理的学习进度显示

## 后续扩展方向

1. **阶段三**：实现综合强化阶段，包含听、说、写等多种题型
2. **语音评测**：集成 Whisper 进行语音识别和评测
3. **语言入口页**：实现语言选择和文件管理功能
4. **主页聚类**：实现语言体系的动态聚类展示

---

本计划基于当前代码base和用户需求制定，确保所有功能都能与原始需求一一对应，并按照合理的开发顺序实施。