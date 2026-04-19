# 少邻国 (Lesslingo) - 学习阶段二 - 实现计划

## [ ] Task 1: 集成 Claude Haiku 4.5 AI 引擎
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 替换 NVIDIA API 为 Claude Haiku 4.5
  - 实现非流式输出，等待生成完成后传输
  - 配置 API 调用参数，设置 temperature=0
- **Acceptance Criteria Addressed**: AC-8, AC-10
- **Test Requirements**:
  - `programmatic`: API 调用成功，返回完整结果
  - `programmatic`: 非流式输出，一次性传输完整结果
- **Notes**: 需要确保 Claude Haiku 4.5 API 访问配置正确

## [ ] Task 2: 优化单词表处理逻辑
- **Priority**: P0
- **Depends On**: Task 1
- **Description**:
  - 修改单词表处理逻辑，改为逐句处理
  - 每次得到上一句的结果后再进行下一句的处理
  - 确保处理过程稳定可靠
- **Acceptance Criteria Addressed**: AC-10
- **Test Requirements**:
  - `programmatic`: 逐句处理逻辑正确
  - `programmatic`: 处理结果与预期一致
- **Notes**: 注意处理过程中的错误处理和边界情况

## [ ] Task 3: 实现单词卡片组件
- **Priority**: P0
- **Depends On**: None
- **Description**:
  - 创建单词卡片组件，显示单词、音标、释义、例句等
  - 支持从单词表点击进入
  - 严格遵循 Anthropic 品牌指南
- **Acceptance Criteria Addressed**: AC-4, AC-7
- **Test Requirements**:
  - `human-judgment`: 卡片布局美观，信息完整
  - `human-judgment`: 点击单词表单词能正确显示卡片
- **Notes**: 确保卡片样式符合品牌规范

## [ ] Task 4: 实现学习界面组件
- **Priority**: P0
- **Depends On**: Task 3
- **Description**:
  - 创建学习界面，显示单词、音标和4个选项
  - 实现选项选择逻辑和答案验证
  - 正确答案后显示单词卡片，错误答案保持题目显示
- **Acceptance Criteria Addressed**: AC-2, AC-3, AC-4, AC-6
- **Test Requirements**:
  - `human-judgment`: 界面布局清晰，交互流畅
  - `programmatic`: 答案验证逻辑正确
- **Notes**: 确保选项随机排列，正确答案位置不固定

## [ ] Task 5: 实现随机单词学习功能
- **Priority**: P0
- **Depends On**: Task 4
- **Description**:
  - 在单词表页面添加"开始学习"按钮
  - 实现随机单词选择逻辑
  - 预生成第一个单词信息以节省时间
- **Acceptance Criteria Addressed**: AC-1, AC-9
- **Test Requirements**:
  - `human-judgment`: 按钮位置明显，点击响应迅速
  - `programmatic`: 单词随机选择逻辑正确
- **Notes**: 预生成机制需要在用户点击开始学习前完成

## [ ] Task 6: 实现题目生成工具
- **Priority**: P0
- **Depends On**: Task 1, Task 4
- **Description**:
  - 实现 generate_multiple_choice tool，生成4个选项（1个正确，3个干扰项）
  - 确保干扰项合理，与正确答案有一定相似度
  - temperature=0，确保结果稳定
- **Acceptance Criteria Addressed**: AC-2, AC-3
- **Test Requirements**:
  - `programmatic`: 生成的选项符合要求
  - `human-judgment`: 干扰项合理，有一定挑战性
- **Notes**: 干扰项应从其他单词的释义中选择，确保多样性

## [ ] Task 7: 实现下一题功能
- **Priority**: P0
- **Depends On**: Task 4, Task 5
- **Description**:
  - 在单词卡片上添加"下一题"按钮
  - 点击后加载下一个随机单词和选项
  - 确保流畅的过渡动画
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `human-judgment`: 按钮位置合理，点击响应流畅
  - `programmatic`: 下一题逻辑正确，无重复题目
- **Notes**: 确保题目切换时的动画效果符合品牌风格

## [ ] Task 8: 集成所有组件到主应用
- **Priority**: P0
- **Depends On**: Task 2, Task 3, Task 4, Task 5, Task 6, Task 7
- **Description**:
  - 将所有学习相关组件集成到主应用
  - 确保从单词表到学习界面的完整流程
  - 测试所有功能的集成效果
- **Acceptance Criteria Addressed**: All ACs
- **Test Requirements**:
  - `human-judgment`: 完整流程测试，各页面切换流畅
  - `human-judgment`: 所有功能正常工作
- **Notes**: 确保状态管理正确，避免内存泄漏

## [ ] Task 9: 测试和优化
- **Priority**: P1
- **Depends On**: Task 8
- **Description**:
  - 全面测试功能，修复bug
  - 优化性能和用户体验
  - 确保符合 Anthropic 品牌指南
- **Acceptance Criteria Addressed**: All ACs
- **Test Requirements**:
  - `human-judgment`: 所有功能正常工作
  - `human-judgment`: 动画和交互流畅
  - `human-judgment`: 品牌一致性
- **Notes**: 重点测试边界情况和错误处理