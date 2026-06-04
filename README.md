# 呱邻国 (Gualingo)

AI 驱动的沉浸式外语学习平台。输入任意文本，自动生成分级词汇表、多种练习题型，配合 TTS 语音朗读，打造个性化学习体验。

## 核心功能

### 文本处理与词汇生成
- 输入任意文本，自动检测语言，分句翻译
- LLM 驱动的词汇提取、去重、分组
- 结构化字典生成：音标、释义、词形变体、例句
- 支持单词优先级标记和重新生成

### 多阶段学习体系
- **阶段一 — 词汇认知**：单词卡片学习，展示释义、发音、例句
- **阶段二 — 句子练习**：翻译选择、填空练习
- **阶段三 — 综合训练**：听力测验、遮蔽填空、翻译重组
- 单元制学习，每单元 5-8 词，完成后获得星级评价
- 错题回顾模式，自动收集错误项进行强化

### 练习题型
- 单词选择（四选一）
- 句子翻译选择
- 听力理解测验
- 遮蔽句子填空（Masked Sentence）
- 翻译重组（Translation Reconstruction）

### 语音朗读 (TTS)
- 基于 Web Speech API，支持 120+ 种语言
- 常速/慢速播放切换
- 句子、单词均可朗读

### 多语言界面 (i18n)
- 中/英静态翻译 + LLM 动态翻译覆盖
- 3 级翻译缓存：内存 → 文件 → LLM
- 切换界面语言时自动调用 LLM 生成翻译
- 支持 161+ 个界面翻译键

### 其他功能
- 学习历史记录，可随时回顾
- 用户偏好设置（每页词数、API 频率、目标语言等）
- 最近使用语言快速切换
- 词汇表排序、搜索、筛选
- 单词详解面板（可重新生成）
- 响应式设计，动画过渡

## 项目结构

```
/workspace
├── backend/                  # Python FastAPI 后端
│   ├── main.py               # 主应用（41 个 API 端点）
│   ├── nvidia_api.py         # LLM API 集成（SiliconFlow）
│   ├── text_processor.py     # 文本处理（分句、分词）
│   ├── storage.py            # 本地文件系统存储
│   ├── ui_translations.py    # UI 翻译 Schema 与 LLM 提示模板
│   └── requirements.txt
├── frontend/                 # React 前端
│   ├── src/
│   │   ├── App.jsx           # 主应用组件（路由、状态管理）
│   │   ├── components/       # 19 个组件
│   │   │   ├── InputStep.jsx             # 文本输入页
│   │   │   ├── DictionaryStep.jsx        # 字典浏览页
│   │   │   ├── LearningStep.jsx          # 单词学习
│   │   │   ├── SentenceQuizStep.jsx      # 句子翻译练习
│   │   │   ├── ListeningQuizStep.jsx     # 听力测验
│   │   │   ├── MaskedSentenceExerciseStep.jsx  # 遮蔽填空
│   │   │   ├── TranslationReconstructionStep.jsx # 翻译重组
│   │   │   ├── PhaseSelectorStep.jsx     # 阶段选择
│   │   │   ├── PhaseProgressStep.jsx     # 阶段进度
│   │   │   ├── AllUnitsStep.jsx          # 全部单元
│   │   │   ├── UnitCompleteStep.jsx      # 单元完成
│   │   │   ├── VocabListStep.jsx         # 词汇列表
│   │   │   ├── ProgressStep.jsx          # 学习进度
│   │   │   ├── WordListPanel.jsx         # 单词列表面板
│   │   │   ├── WordDetail.jsx            # 单词详情
│   │   │   ├── SentenceDetail.jsx        # 句子详情
│   │   │   ├── HistorySidebar.jsx        # 历史侧栏
│   │   │   ├── SettingsModal.jsx         # 设置弹窗
│   │   │   └── ConfirmDialog.jsx         # 确认对话框
│   │   └── utils/
│   │       ├── api.js          # API 调用封装
│   │       ├── speech.js       # TTS 语音（120+ 语言映射）
│   │       ├── translations.js # 中/英静态翻译
│   │       └── vocab.js        # 词汇工具函数
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── config/                   # 配置与缓存
│   ├── user_preferences.json  # 用户偏好
│   └── ui_translations/       # LLM 生成的翻译缓存
└── data/                     # 本地数据存储
    └── files/
```

## 快速开始

### 1. 安装后端依赖

```bash
cd /workspace/backend
pip install -r requirements.txt
python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords')"
```

### 2. 启动后端服务

```bash
cd /workspace/backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

后端 API 文档：http://localhost:8000/docs

### 3. 安装前端依赖

```bash
cd /workspace/frontend
npm install
```

### 4. 启动前端服务

```bash
npm run dev
```

访问：http://localhost:3000

## 技术栈

**后端**：
- FastAPI + Uvicorn
- SiliconFlow API（LLM 驱动的翻译、词汇生成、UI 翻译）
- NLTK（分词处理）
- 本地文件系统存储

**前端**：
- React 18 + Vite
- TailwindCSS
- Framer Motion（动画）
- Lucide React（图标）
- Web Speech API（TTS 语音朗读）

## API 端点概览

| 类别 | 端点 | 说明 |
|------|------|------|
| 文本处理 | `POST /api/process-text` | 处理文本并生成学习资料 |
| | `GET /api/status/{file_id}` | 查询处理状态 |
| | `POST /api/detect-language` | 检测文本语言 |
| | `POST /api/translate-text` | 翻译文本 |
| | `POST /api/generate-text` | LLM 生成文本 |
| 词汇 | `GET /api/vocab/{file_id}` | 获取词汇表 |
| | `GET /api/word/{file_id}/{word}` | 获取单词详情 |
| | `GET /api/word-detail` | 查询单词详解 |
| | `POST /api/word-detail/regenerate` | 重新生成单词详解 |
| | `GET /api/word-list` | 全局词汇列表 |
| | `GET /api/sentences/{file_id}` | 获取句子列表 |
| 学习 | `POST /api/learn/{file_id}/start-word-gen` | 开始词汇生成 |
| | `POST /api/learn/{file_id}/stop-word-gen` | 停止词汇生成 |
| | `POST /api/learn/{file_id}/priority-word-gen` | 优先生成指定词 |
| | `GET /api/learn/{file_id}/word-gen-progress` | 词汇生成进度 |
| | `GET /api/learn/{file_id}/random-word` | 获取随机单词 |
| | `POST /api/learn/{file_id}/next-word` | 获取下一个学习词 |
| | `POST /api/learn/{file_id}/set-progress` | 设置学习进度 |
| | `GET /api/learn/{file_id}/progress` | 获取学习进度 |
| | `GET /api/learn/{file_id}/sentence-quiz` | 获取句子测验 |
| | `GET /api/learn/{file_id}/check-coverage` | 检查词汇覆盖率 |
| 单元与阶段 | `GET /api/{file_id}/phases` | 获取学习阶段 |
| | `GET /api/{file_id}/phase/{phase_number}/units` | 获取阶段内单元 |
| | `GET /api/{file_id}/phase/{phase_number}/unit/{unit_id}` | 获取单元内容 |
| | `POST /api/{file_id}/phase/{phase_number}/unit/{unit_id}/next` | 获取单元下一题 |
| | `POST /api/{file_id}/phase/{phase_number}/unit/{unit_id}/complete` | 完成单元 |
| | `POST /api/{file_id}/phase/{phase_number}/set-progress` | 设置阶段进度 |
| 星级 | `GET /api/learn/{file_id}/unit-stars` | 获取单元星级 |
| | `POST /api/learn/{file_id}/unit-stars` | 设置单元星级 |
| 设置与历史 | `GET/POST /api/settings` | 获取/保存设置 |
| | `GET/POST /api/user-preferences` | 获取/保存用户偏好 |
| | `GET /api/history` | 获取学习历史 |
| | `DELETE /api/history/{file_id}` | 删除历史记录 |
| | `PUT /api/history/{file_id}` | 更新历史记录 |
| | `GET /api/file/{file_id}/info` | 获取文件信息 |
| 国际化 | `GET /api/translate_ui/{lang_code}` | 获取界面翻译 |
| 其他 | `GET /api/tts` | TTS 语音合成 |
