# Lesslingo 新功能实现计划

## 项目概述
实现 Lesslingo 的主页面、语言详情页面以及学习新段落功能，完善数据管理和用户体验。

## 核心需求分析

1. **主页面 (Home Page)**:
   - Lesslingo 标题
   - 左侧：已学习的语言列表
   - 右侧：动态展示待学习的语言

2. **语言详情页面 (LanguageDetail Page)**:
   - 顶部：学习新段落按钮
   - 左侧：文章列表（优先显示文章本身标题）
   - 右侧：语言介绍（包括文字介绍、名言、历史、与其他语言的渊源等）
   - 角落：切换母语和批量管理删除功能
   - 点击文章标题跳转到现有单词表界面

3. **修改 InputStep**:
   - 从语言详情页面进入时，预设好母语和目标语言
   - 保持原有功能

4. **数据管理**:
   - 支持保存文章元数据（标题、语言对、时间等）
   - 支持删除文章
   - 按语言组织数据

## 技术方案

### 1. 数据结构设计

#### 语言数据目录结构
```
data/
├── languages/              # 语言介绍数据
│   ├── zh/
│   │   ├── intro.json      # 中文的介绍（面向中文母语者）
│   │   └── ...
│   ├── en/
│   │   ├── intro.json      # 英语的介绍
│   │   └── ...
│   └── ...
├── files/                  # 已有的文本处理文件（保持不变）
└── articles.json           # 文章索引数据
```

#### articles.json 结构
```json
{
  "articles": [
    {
      "id": "text_20240420_123456_789",
      "title": "文章标题",
      "sourceLang": "en",
      "targetLang": "zh",
      "createdAt": "2024-04-20T12:00:00.000Z",
      "fileId": "text_20240420_123456_789"
    }
  ]
}
```

#### 语言介绍 intro.json 结构
```json
{
  "name": "中文",
  "description": "中文是世界上使用人数最多的语言...",
  "quotes": [
    "学而不思则罔，思而不学则殆。——孔子",
    "千里之行，始于足下。——老子"
  ],
  "history": "中文有着悠久的历史...",
  "relationships": [
    {
      "language": "日语",
      "description": "日语中有大量汉字..."
    }
  ]
}
```

### 2. 后端实现

#### 修改 storage.py
添加新的方法：
- `save_article(article_data)` - 保存文章元数据
- `load_articles()` - 加载所有文章
- `get_articles_by_language(target_lang)` - 按语言获取文章
- `delete_article(file_id)` - 删除文章
- `get_language_intro(lang_code)` - 获取语言介绍

#### 修改 main.py
添加新的 API 端点：
- `GET /api/articles` - 获取所有文章
- `GET /api/articles/{target_lang}` - 按语言获取文章
- `DELETE /api/articles/{file_id}` - 删除文章
- `GET /api/languages/{lang}/intro` - 获取语言介绍

### 3. 前端实现

#### 新增组件
1. `HomePage.jsx` - 主页面
2. `LanguageDetailPage.jsx` - 语言详情页面
3. `NewParagraphPage.jsx` - 新段落页面（复用现有 InputStep）

#### 修改现有组件
1. `App.jsx` - 添加路由状态管理新页面
2. `InputStep.jsx` - 支持预设语言
3. `api.js` - 添加新的 API 调用方法
4. `translations.js` - 添加新的翻译文本

### 4. 页面状态流程

```
HomePage
└─── 点击已学习语言 → LanguageDetailPage
     ├─── 点击文章标题 → 跳转到现有单词表流程（DictionaryStep）
     └─── 点击学习新段落 → NewParagraphPage
          └─── 处理完成 → 返回到 LanguageDetailPage（文章列表自动更新）
```

## 实现步骤

### 第一步：后端数据结构和 API
1. 更新 storage.py 添加新方法
2. 更新 main.py 添加新 API
3. 创建示例语言介绍数据

### 第二步：前端基础架构
1. 更新 translations.js 添加翻译
2. 更新 api.js 添加新 API 调用
3. 更新 App.jsx 状态管理新页面

### 第三步：主页面实现
1. 创建 HomePage.jsx 组件
2. 实现已学习语言列表
3. 实现动态语言展示

### 第四步：语言详情页面实现
1. 创建 LanguageDetailPage.jsx
2. 实现文章列表展示
3. 实现语言介绍展示
4. 实现切换母语和批量删除功能

### 第五步：新段落页面实现
1. 创建 NewParagraphPage.jsx（复用 InputStep）
2. 支持语言预设
3. 处理完成后跳转

### 第六步：集成测试
1. 测试完整流程
2. 测试数据删除
3. 测试动态效果

## 依赖考虑
- 保持现有代码风格一致
- 保持与现有单词表流程的无缝连接
- 使用 framer-motion 实现动画效果
- 使用 lucide-react 保持图标风格一致

## 风险和注意事项
- 数据删除时需要同时清理多个文件
- 保持向后兼容现有数据结构
- 多语言支持需要覆盖新功能文本
