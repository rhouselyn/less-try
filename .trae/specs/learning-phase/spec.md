# 少邻国 (Lesslingo) - 学习阶段二 - 产品需求文档

## Overview
- **Summary**: 实现学习阶段二的核心功能，包括单词学习界面、随机单词学习、题目生成和答案验证，使用 Claude Haiku 4.5 作为 AI 引擎。
- **Purpose**: 提供交互式词汇学习体验，帮助用户通过练习巩固词汇掌握。
- **Target Users**: 语言学习者，需要通过练习测试词汇掌握程度的用户。

## Goals
- 实现随机单词学习功能
- 创建单词卡片展示界面
- 实现选择题型：显示单词和音标，提供4个选项
- 正确答案后显示单词详细解释卡片
- 错误答案时保持题目显示直到选择正确
- 使用 Claude Haiku 4.5 作为 AI 引擎
- 优化 LLM 输出为非流式，等待生成完成后传输
- 单词表处理改为逐句处理
- 学习前预生成第一个单词信息以节省时间

## Non-Goals (Out of Scope)
- 音频听写题
- 多轮对话练习
- 学习阶段三的功能
- 更改单词表的内容和排版

## Background & Context
- 第一阶段已实现文本处理和字典生成功能
- 需要扩展为完整的学习体验，包括练习环节
- 用户需要能够测试自己对词汇的掌握程度
- 已有的词汇表数据包含单词、释义和其他必要信息

## Functional Requirements
- **FR-1**: 随机单词学习 - 点击按钮开始随机单词学习
- **FR-2**: 学习界面 - 显示单词、音标，提供4个选项
- **FR-3**: 答案验证 - 选择答案后验证正确性
- **FR-4**: 单词卡片 - 正确答案后显示单词详细解释
- **FR-5**: 错误处理 - 错误答案时保持题目显示
- **FR-6**: 下一题功能 - 正确答案后显示下一题按钮
- **FR-7**: 单词表点击 - 点击单词表中的单词显示单词卡片
- **FR-8**: AI 引擎集成 - 使用 Claude Haiku 4.5 生成内容
- **FR-9**: 预生成优化 - 学习前预生成第一个单词信息

## Non-Functional Requirements
- **NFR-1**: 性能 - LLM 输出改为非流式，等待生成完成后传输
- **NFR-2**: 处理效率 - 单词表处理改为逐句处理
- **NFR-3**: 响应速度 - 预生成第一个单词信息以节省时间
- **NFR-4**: 视觉设计 - 严格遵循 Anthropic 品牌指南
- **NFR-5**: 交互体验 - 流畅的动画和过渡效果

## Constraints
- **Technical**: 基于现有代码base，使用 React 前端
- **Dependencies**: 依赖第一阶段生成的词汇表数据
- **AI Engine**: 使用 Claude Haiku 4.5 替代 NVIDIA API
- **Branding**: 必须严格遵循 Anthropic 品牌指南

## Assumptions
- 词汇表数据已包含单词、释义和其他必要信息
- 用户在字典页面后会进入学习环节
- Claude Haiku 4.5 API 可正常访问和使用

## Acceptance Criteria

### AC-1: 随机单词学习功能
- **Given**: 用户在单词表页面
- **When**: 点击"开始学习"按钮
- **Then**: 进入随机单词学习界面，显示第一个单词和选项
- **Verification**: `human-judgment`

### AC-2: 学习界面布局
- **Given**: 用户进入学习界面
- **When**: 查看界面
- **Then**: 显示单词、音标，下方显示4个选项
- **Verification**: `human-judgment`

### AC-3: 答案验证
- **Given**: 用户选择答案
- **When**: 点击选项
- **Then**: 正确答案高亮，错误答案显示错误提示
- **Verification**: `human-judgment`

### AC-4: 单词卡片展示
- **Given**: 用户选择正确答案
- **When**: 验证完成后
- **Then**: 显示单词详细解释卡片，包含音标、释义、例句等
- **Verification**: `human-judgment`

### AC-5: 下一题功能
- **Given**: 用户查看单词卡片
- **When**: 点击"下一题"按钮
- **Then**: 显示下一个随机单词和选项
- **Verification**: `human-judgment`

### AC-6: 错误处理
- **Given**: 用户选择错误答案
- **When**: 点击选项
- **Then**: 显示错误提示，保持题目显示直到选择正确答案
- **Verification**: `human-judgment`

### AC-7: 单词表点击功能
- **Given**: 用户在单词表页面
- **When**: 点击某个单词
- **Then**: 显示该单词的详细解释卡片
- **Verification**: `human-judgment`

### AC-8: AI 引擎集成
- **Given**: 系统生成内容
- **When**: 需要 AI 生成
- **Then**: 使用 Claude Haiku 4.5 生成内容
- **Verification**: `programmatic`

### AC-9: 预生成优化
- **Given**: 用户点击"开始学习"按钮
- **When**: 进入学习界面
- **Then**: 第一个单词信息已预生成，无需等待
- **Verification**: `human-judgment`

### AC-10: LLM 输出优化
- **Given**: 系统生成内容
- **When**: AI 处理完成
- **Then**: 一次性传输完整结果，而非流式输出
- **Verification**: `programmatic`

## Open Questions
- [ ] Claude Haiku 4.5 API 的具体调用方式和参数设置
- [ ] 单词表逐句处理的具体实现方式
- [ ] 预生成单词信息的存储和管理策略