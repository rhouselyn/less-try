# 少邻国 (Lesslingo) - 核心功能重构 - 产品需求文档

## Overview
- **Summary**: 重构少邻国的核心处理管线，实现自动分句、智能词汇提取、Tool Call 结构化生成以及优化前端界面。
- **Purpose**: 实现更智能的文本处理和更清晰的字典展示界面，提升用户体验。
- **Target Users**: 语言学习者，需要通过输入文本生成学习资料的用户。

## Goals
- 实现自动分句（基于标点符号）和词汇去重功能
- 设计并实现 `generate_dictionary` Tool Schema，强制 JSON 输出
- 输出包含翻译、分词、音标、释义、变体、例句、选项和语法讲解
- 优化前端流程：点击生成按钮后跳转到单词表页面
- 实现双栏/卡片式字典 UI：左侧单词（随机排列），右侧详细信息

## Non-Goals (Out of Scope)
- 多模态输入（音频、图片）处理
- TTS 音频生成
- 学习阶段二和三的功能
- 本地存储结构变更

## Background & Context
- 现有系统已实现基础的文本处理和字典生成功能
- 需要重构以支持更智能的分句和结构化输出
- 前端界面需要优化为更清晰的双栏字典布局

## Functional Requirements
- **FR-1**: 自动分句 - 检测标点符号（句号、问号、感叹号等）自动切分文本为句子
- **FR-2**: 词汇提取和去重 - 从每个句子中提取单词并全局去重
- **FR-3**: Tool Schema - 定义 `generate_dictionary` 工具，强制输出 JSON 格式
- **FR-4**: 结构化输出 - 包含翻译、分词、音标、释义、变体、例句、选项和语法讲解
- **FR-5**: 前端流程 - 点击生成按钮后跳转到单词表页面
- **FR-6**: 双栏字典 UI - 左侧单词列表（随机排列），右侧详细信息

## Non-Functional Requirements
- **NFR-1**: 性能 - 处理速度快，响应及时
- **NFR-2**: 可用性 - 界面清晰直观，操作简单
- **NFR-3**: 可靠性 - 系统稳定，错误处理合理
- **NFR-4**: 视觉设计 - 简约现代，符合 Anthropic 风格

## Constraints
- **Technical**: 基于现有代码base，使用 FastAPI 后端和 React 前端
- **Dependencies**: 依赖 LLM API 进行文本处理和生成

## Assumptions
- LLM API 能够正常响应并返回结构化数据
- 用户输入为纯文本，不包含复杂格式
- 系统运行环境具备基本的网络连接和计算资源

## Acceptance Criteria

### AC-1: 自动分句
- **Given**: 用户输入包含多个句子的文本
- **When**: 系统处理文本
- **Then**: 自动切分为多个句子
- **Verification**: `programmatic`

### AC-2: 词汇提取和去重
- **Given**: 输入文本包含重复单词
- **When**: 系统处理文本
- **Then**: 提取的单词列表中每个单词只出现一次
- **Verification**: `programmatic`

### AC-3: Tool Schema 实现
- **Given**: 系统调用 LLM API
- **When**: 生成词汇信息
- **Then**: LLM 返回符合 Tool Schema 的 JSON 格式数据
- **Verification**: `programmatic`

### AC-4: 结构化输出
- **Given**: 系统处理文本
- **When**: 生成词汇信息
- **Then**: 输出包含翻译、分词、音标、释义、变体、例句、选项和语法讲解
- **Verification**: `programmatic`

### AC-5: 前端流程优化
- **Given**: 用户点击生成按钮
- **When**: 系统处理完成
- **Then**: 自动跳转到单词表页面
- **Verification**: `human-judgment`

### AC-6: 双栏字典 UI
- **Given**: 系统生成词汇表
- **When**: 跳转到单词表页面
- **Then**: 页面显示双栏布局，左侧单词列表，右侧详细信息
- **Verification**: `human-judgment`

## Open Questions
- [ ] 具体的分句标点符号规则是什么？
- [ ] 词汇去重的具体实现方式？
