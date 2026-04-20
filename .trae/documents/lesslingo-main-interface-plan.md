
# Lesslingo 主界面设计计划

## 1. 项目概述
本次任务是为 Lesslingo 语言学习应用开发新的主界面，包含以下核心功能：
- 显示"已学习"语言（左侧）和"待学习"语言（右侧，带动画效果）
- 语言详情页（显示文章列表、语言介绍、名言、历史等）
- 添加新文章页面
- 集成现有学习流程（单词表、学习步骤等）

## 2. 现有代码结构分析

### 后端（backend/）
- main.py: FastAPI 应用，包含文本处理、单词生成、学习进度等 API
- storage.py: 数据存储，处理文件、词汇表、学习进度等的读写
- nvidia_api.py: NVIDIA API 调用
- text_processor.py: 文本处理

### 前端（frontend/）
- App.jsx: 主应用组件，管理当前步骤和状态
- components/: 包含现有步骤组件（InputStep, DictionaryStep, LearningStep 等）
- utils/api.js: API 调用工具

## 3. 数据结构设计

### 3.1 语言配置
需要在 `/workspace/data/languages/{lang_code}/` 下存储语言相关信息：
- intro.json: 语言介绍（包含描述、名言、历史、与其他语言关系等）
- [文章ID]/: 每篇文章的独立文件夹

### 3.2 语言介绍数据结构 (intro.json)
```json
{
  "name": "中文",
  "code": "zh",
  "description": "一段介绍该语言的文字",
  "famous_quotes": [
    {
      "quote": "名言内容",
      "author": "作者"
    }
  ],
  "history": "语言历史介绍",
  "relations": "与其他语言的关系介绍"
}
```

### 3.3 文章数据结构
每篇文章应该包含：
- 元数据（标题、创建时间等）
- 原始文本
- 处理后的词汇表、句子翻译等

## 4. 后端功能扩展

需要在 backend/main.py 和 backend/storage.py 中添加以下 API：

### 4.1 API 列表
1. GET /api/languages: 获取所有语言列表（区分已学习/待学习）
2. GET /api/languages/{lang_code}: 获取特定语言的介绍信息
3. GET /api/languages/{lang_code}/articles: 获取该语言的所有文章
4. POST /api/languages/{lang_code}/articles: 添加新文章
5. DELETE /api/languages/{lang_code}/articles/{article_id}: 删除文章
6. GET /api/languages/{lang_code}/articles/{article_id}: 获取文章详情（用于进入现有学习流程）

### 4.2 Storage 类扩展
需要在 storage.py 中添加以下方法：
- get_languages(): 获取所有语言列表
- get_language_intro(lang_code): 获取语言介绍
- save_language_intro(lang_code, intro_data): 保存语言介绍
- get_articles(lang_code): 获取某语言的所有文章
- save_article(lang_code, article_data): 保存文章
- delete_article(lang_code, article_id): 删除文章

## 5. 前端功能实现

### 5.1 新增组件
1. MainPage.jsx: 主页面（显示已学习/待学习语言）
2. LanguagePage.jsx: 语言详情页（显示文章列表、语言介绍）
3. AddArticlePage.jsx: 添加新文章页面

### 5.2 修改现有组件
1. App.jsx: 添加新的路由逻辑，管理新的页面状态
2. InputStep.jsx: 简化（因为现在语言是预先选择的）
3. api.js: 添加新 API 调用方法

### 5.3 状态管理
在 App.jsx 中管理新状态：
- currentPage: 'main' | 'language' | 'add-article' | ... (现有步骤保持不变)
- selectedLanguage: 当前选择的语言代码
- selectedArticle: 当前选择的文章ID

## 6. 实现步骤

### 阶段 1: 后端扩展
1. 扩展 Storage 类，添加语言和文章管理方法
2. 实现新的 API 端点
3. 测试后端 API

### 阶段 2: 前端基础
1. 更新 api.js 添加新 API 调用
2. 修改 App.jsx 添加新页面状态管理
3. 创建 MainPage.jsx 组件
4. 测试主页面显示

### 阶段 3: 语言详情页
1. 创建 LanguagePage.jsx
2. 实现文章列表显示
3. 实现语言介绍展示
4. 集成学习流程跳转

### 阶段 4: 添加文章页
1. 创建 AddArticlePage.jsx
2. 实现文本粘贴和提交功能
3. 集成到现有学习流程

### 阶段 5: 优化和测试
1. UI 优化和动画效果
2. 完整流程测试
3. 修复 bug

## 7. 技术栈
- 后端: FastAPI, Python
- 前端: React, Framer Motion (动画), Tailwind CSS
- 存储: 本地文件系统 (JSON)

## 8. 注意事项
- 保持现有学习流程不变
- 使用现有组件（DictionaryStep, LearningStep 等）
- 遵循现有代码风格
- 添加适当的错误处理

