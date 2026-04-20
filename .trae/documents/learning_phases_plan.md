
# 学习阶段功能实现计划

## 1. 概述
本次实现将为 Lesslingo 添加两个学习阶段，每个阶段有8个句子为一个单元，支持跨阶段访问：
- **第一阶段**：现有单词选择和翻译功能（保留）
- **第二阶段**：两个新练习类型
  - 练习1：随机句子单词蒙版填空（大于8个词的句子，每8个词多蒙一个）
  - 练习2：母语翻译→原文还原（带tokens干扰项）

## 2. 后端变更
### 2.1 存储层 (storage.py)
- 添加 `save_phase_progress`/`load_phase_progress`：保存阶段学习进度
- 添加 `save_sentence_order`/`load_sentence_order`：保存句子的随机顺序（固定）
- 添加 `save_phase2_exercise_cache`/`load_phase2_exercise_cache`：练习缓存

### 2.2 主后端 (main.py)
- 添加新 API 端点：
  - `GET /api/{file_id}/phases`: 获取阶段列表和进度
  - `GET /api/{file_id}/phase/{phase_number}/units`: 获取阶段下的单元
  - `GET /api/{file_id}/phase/{phase_number}/unit/{unit_id}`: 获取单元内的练习
  - `POST /api/{file_id}/phase/{phase_number}/unit/{unit_id}/next`: 下一个练习
  - `POST /api/{file_id}/phase/{phase_number}/unit/{unit_id}/complete`: 单元完成

### 2.3 文本处理 (text_processor.py)
- 添加 `generate_masked_sentence`：生成蒙版填空句子
- 添加 `tokenize_sentence`：句子分词
- 辅助函数用于准备第二阶段的练习数据

## 3. 前端变更
### 3.1 组件添加
- `PhaseSelectorStep.jsx`：阶段选择页面（显示第一、第二阶段）
- `PhaseProgressStep.jsx`：阶段内单元列表页面
- `MaskedSentenceExerciseStep.jsx`：练习1（蒙版填空）
- `TranslationReconstructionStep.jsx`：练习2（翻译还原）

### 3.2 现有组件更新
- `App.jsx`：添加新步骤状态管理，集成新组件
- `ProgressStep.jsx`：调整为阶段选择入口（或替换为新的阶段选择器）
- 添加新翻译项到 translations.js

### 3.3 API 工具 (utils/api.js)
- 添加新 API 调用方法：
  - `getPhases`
  - `getPhaseUnits`
  - `getPhaseUnitExercise`
  - `nextPhaseExercise`
  - `completePhaseUnit`

## 4. 数据流
1. 处理文本后，句子被分为8句一组的单元
2. 每个阶段的句子顺序在处理阶段固定并保存
3. 练习数据可缓存以提高速度
4. 进度保存支持跨会话继续学习

## 5. 风险与注意事项
- 保持第一阶段现有功能完整
- 确保两阶段可以独立访问，无需先完成另一阶段
- 阶段内练习必须按顺序完成
