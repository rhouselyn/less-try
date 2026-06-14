[中文](../README.md) | **English** | [日本語](README_ja.md) | [한국어](README_ko.md) | [Español](README_es.md) | [Français](README_fr.md)

<div align="center">

# 🐸 呱邻国

**Fully AI-driven. Enter your API key, achieve language freedom.**

[![React](https://img.shields.io/badge/React-18-61dafb?logo=react)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.10+-3776ab?logo=python)](https://python.org)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](../LICENSE)

</div>

---

## What is 呱邻国?

呱邻国 is an AI-driven immersive foreign language learning platform. You provide any text, and the AI automatically generates a vocabulary list, sentence-by-sentence translation, and various exercises. With voice narration, every piece of text becomes your personalized learning material.

**Any language → any language. Your material, your rules.**

**Only one API Key needed. Pure LLM power drives everything.**

---

## Details

👉 [View the full introduction page](https://rhouselyn.github.io/Guapage)

---

## Core Design Philosophy

### Zero Manual Intervention, Pure LLM-Driven

From sentence parsing and word segmentation to definition generation, **everything is handled by the LLM with no manual rules or dictionary dependencies**. AI understands context, automatically determines word boundaries, extracts roots, generates definitions and example sentences — you just provide the text, AI does the rest.

### Elegant LLM Output Format

Carefully designed prompts and structured output formats ensure that LLM returns clean, parseable, and directly usable data. No post-processing corrections needed — one call yields the desired result.

### Minimal Token Consumption

By streamlining prompts, compressing output formats, and avoiding redundant fields, **token consumption is minimized**. The same learning content is completed with fewer tokens, reducing API costs.

---

## Demo Video

<div align="center">

<!-- Video placeholder, replace with actual demo video later -->
<!-- <video src="demo.mp4" controls width="100%"></video> -->

📹 *Demo video coming soon*

</div>

---

## 🚀 Quick Start

### Option 1: Download Desktop App (Recommended)

Go to [GitHub Releases](https://github.com/rhouselyn/Gualingo/releases) to download the installer for your platform:

| Platform | File |
|------|------|
| Windows | `Gualingo-Windows.zip` |
| macOS | `Gualingo-macOS.tar.gz` |
| Linux | `Gualingo-Linux.tar.gz` |

Extract and run `Gualingo` — no Python or Node.js installation required.

### Option 2: Docker

```bash
docker run -d \
  -p 8000:8000 \
  -v gualingo-data:/root/.local/share/Gualingo \
  ghcr.io/rhouselyn/gualingo:latest
```

Open http://localhost:8000 to start using.

### Option 3: Run from Source

#### Requirements

- Python 3.10+
- Node.js 18+
- An LLM API Key (supports OpenAI-compatible interfaces, such as SiliconFlow, DeepSeek, etc.)

#### Installation & Launch

```bash
# 1. Install backend dependencies
cd backend
pip install -r requirements.txt

# 2. Start the backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 3. Install frontend dependencies (choose a frontend style)
cd ../frontend-soft-ui
npm install

# 4. Start the frontend
npm run dev
```

Open http://localhost:5174, click the ⚙️ settings icon in the top right corner, enter your API Key, and you're ready to start learning.

#### Desktop App Mode

```bash
# Install desktop app dependencies
pip install pywebview

# Build frontend-soft-ui
cd frontend-soft-ui
npm install
npm run build
cd ..

# Launch desktop app
python app.py
```

---

## 🛠 Tech Stack

| Layer | Technology |
|----|------|
| Frontend | React 18 · Vite · TailwindCSS · Framer Motion · Web Speech API |
| Backend | FastAPI · Uvicorn · OpenAI-compatible LLM API |
| Storage | SQLite (auto-migrates from legacy file data) |
| Desktop | PyWebView · PyInstaller |

---

## 📖 Usage Flow

```
Input text → AI sentence-by-sentence translation → Generate vocabulary list → Phase 1: Learn words → Phase 2: Practice sentences → Mistake review
```

1. **Input text**: Paste directly, translate to target language, or let AI generate
2. **Browse dictionary**: View sentence translations and vocabulary definitions, look up any word at any time
3. **Phase 1**: Word selection, sentence translation, listening comprehension
4. **Phase 2**: Masked fill-in-the-blank, translation reassembly
5. **Mistake review**: Incorrectly answered questions are automatically collected for reinforced practice until mastered

---

## ⚙️ Configuration

All configuration is done through the interface settings — no need to edit configuration files:

- **API Key**: Supports multiple configurations with rotation, auto-switches on rate limiting
- **Native language**: Select the interface display language
- **Items per page**: Control the number of words displayed per page in the vocabulary list
- **Retry interval**: Wait time after API rate limiting

---

## 📄 License

[GNU Affero General Public License v3](../LICENSE)
