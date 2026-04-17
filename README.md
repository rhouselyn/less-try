# 少邻国 (Lesslingo) - 阶段一 MVP

纯本地运行的AI外语学习系统，阶段一已完成：文本输入 → 预处理提取 → Tool Call 结构化生成 → 静态渲染字典。

## 项目结构

```
/workspace
├── backend/           # Python FastAPI 后端
│   ├── main.py        # 主应用
│   ├── nvidia_api.py  # NVIDIA API 集成
│   ├── text_processor.py  # 文本处理
│   ├── storage.py     # 本地存储
│   ├── requirements.txt
│   └── .env
├── frontend/          # React 前端
│   ├── src/
│   │   ├── App.jsx    # 主组件
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── index.html
└── data/              # 本地数据存储
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

打开新终端：

```bash
cd /workspace/frontend
npm install
```

### 4. 启动前端服务

```bash
npm run dev
```

访问：http://localhost:3000

## 阶段一功能

✅ **文本输入**：支持输入任意文本，选择学习语言和母语  
✅ **分句翻译**：调用 minimax-m2.7 自动分句并逐句翻译  
✅ **分词去重**：提取单词、去重，10个词一组批处理  
✅ **字典生成**：Tool Call 结构化生成（音标、释义、变体、2个例句）  
✅ **随机排序**：单词表随机排列  
✅ **字典UI**：左栏单词列表，右栏详细释义卡片  
✅ **本地存储**：pipeline_data.json 和 vocab.json 自动保存

## 技术栈

**后端**：
- FastAPI + Uvicorn
- NVIDIA API (minimax-m2.7)
- NLTK (分词)
- 本地文件系统存储

**前端**：
- React 18 + Vite
- TailwindCSS
- Framer Motion (动画)
- Lucide React (图标)

## API 端点

- `POST /api/process-text` - 处理文本并生成学习资料
- `GET /api/vocab/{file_id}` - 获取单词表
- `GET /api/sentences/{file_id}` - 获取句子列表

## 后续阶段规划

**阶段二**：全模态接入（音频/图片OCR）+ TTS 管线  
**阶段三**：学习阶段二（基础构建引擎 + 动态循环测试）  
**阶段四**：学习阶段三（大随机强化池 + 听说读写）  
**阶段五**：UI 包装（Anthropic 简约风格）
