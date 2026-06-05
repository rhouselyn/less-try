<div align="center">

# 🐸 呱邻国

**AI 驱动的沉浸式外语学习平台**

输入任意文本，AI 自动生成词汇表和多种练习题，配合语音朗读，让每一段文字都变成你的学习材料。

[![React](https://img.shields.io/badge/React-18-61dafb?logo=react)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.10+-3776ab?logo=python)](https://python.org)

</div>

---

## ✨ 特色功能

### 📝 三种输入模式

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| **直接输入** | 粘贴原文直接学习，AI 自动检测语言 | 已有外语文本：文章、歌词、新闻、台词 |
| **翻译学习** | 输入母语文本，AI 翻译成目标语言后再学习 | 想用自己熟悉的素材来学外语 |
| **AI 生成** | 输入主题，AI 生成目标语言文本后再学习 | 没有素材时，让 AI 按需生成学习内容 |

### 🎯 两种学习阶段

| 阶段 | 内容 | 题型 |
|------|------|------|
| **阶段一 · 词汇认知** | 单词卡片 + 句子翻译 | 单词选择（四选一）、句子翻译选择 |
| **阶段二 · 综合训练** | 听力 + 填空 + 重组 | 听力理解、遮蔽句子填空、翻译重组 |

每个单元 10 道题，完成后获得 ⭐ 星级评价，答错的题自动进入错题回顾。

### 🔊 语音朗读

基于浏览器原生 TTS，支持 120+ 种语言。单词和句子都能朗读，常速/慢速自由切换。

### 🌍 多语言界面

支持任意语言作为母语——选择你的母语后，整个界面自动翻译为该语言，让不同母语的用户都能无障碍使用。

### 📚 词汇管理

- 全局词汇表：跨文件汇总所有学过的词
- 字典浏览：音标、释义、词形变体、例句一应俱全
- 单词详解：AI 生成深度解析，不满意可重新生成

---

## 🚀 快速开始

### 环境要求

- Python 3.10+
- Node.js 18+
- 一个 LLM API Key（支持 OpenAI 兼容接口）

### 安装与启动

```bash
# 1. 安装后端依赖
cd backend
pip install -r requirements.txt

# 2. 启动后端
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 3. 安装前端依赖
cd ../frontend
npm install

# 4. 启动前端
npm run dev
```

打开 http://localhost:5173 ，点击右上角 ⚙️ 设置填入你的 API Key，就可以开始学习了。

---

## 🛠 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 18 · Vite · TailwindCSS · Framer Motion · Web Speech API |
| 后端 | FastAPI · Uvicorn · SiliconFlow / OpenAI 兼容 LLM API |
| 存储 | 本地文件系统（零配置，开箱即用） |

---

## 📖 使用流程

```
输入文本 → AI 分句翻译 → 生成词汇表 → 阶段一：学单词 → 阶段二：练句子 → 错题回顾
```

1. **输入文本**：直接粘贴、翻译成目标语言、或让 AI 生成
2. **浏览字典**：查看分句翻译和词汇释义
3. **阶段一**：逐个学习单词，完成句子翻译选择
4. **阶段二**：听力测验、填空练习、翻译重组
5. **错题回顾**：答错的题自动收集，强化练习直到掌握

---

## ⚙️ 配置

所有配置通过界面设置完成，无需编辑配置文件：

- **API Key**：支持多组配置轮询
- **母语**：选择界面显示语言
- **每页数量**：控制词汇表每页显示的单词数
- **重试间隔**：API 限速后的等待时间

---

## 📄 许可

MIT License

Copyright (c) 2025 Lesslingo

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
