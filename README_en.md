[中文](README.md) | **English** | [日本語](README_ja.md) | [한국어](README_ko.md) | [Español](README_es.md) | [Français](README_fr.md)

<div align="center">

# 🐸 呱邻国

**Fully AI-driven. Enter your API key, achieve language freedom.**

[![React](https://img.shields.io/badge/React-18-61dafb?logo=react)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.10+-3776ab?logo=python)](https://python.org)
[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](LICENSE)

</div>

---

## What is 呱邻国?

呱邻国 is an AI-driven immersive foreign language learning platform. You provide any text, and the AI automatically generates a vocabulary list, sentence-by-sentence translation, and various exercises. With voice narration, every piece of text becomes your personalized learning material.

**Any language → any language. Your material, your rules.**

**Only one API Key needed. No database required. Pure LLM power drives everything.**

---

## What 呱邻国 Does That Duolingo Can't

| Duolingo's Shortcomings | 呱邻国's Solutions |
|-------------|-------------|
| **No word list, no way to review** | Automatically generates a complete vocabulary list with alphabetical index, search, and per-word details. Look up any word's definition, phonetics, inflections, and example sentences at any time |
| **Want to look up other words while doing exercises** | Open the vocabulary panel at any time during learning to check any word's definition and details without interrupting your learning flow |
| **Hard to apply what you've learned** | Learn from whatever material you provide — lyrics, news, scripts, papers. What you learn is what you'll actually encounter |
| **Less common languages not supported** | Supports learning any language pair. AI auto-detects languages, with TTS narration in 120+ languages. No longer limited by platform resources |
| **Can't deeply understand an article** | Drop in an article and the AI provides sentence-by-sentence translation, extracts all vocabulary, and generates exercises. From words to sentences to the whole article — thoroughly master every piece |

---

## How Does It Meet Your Needs?

### 🎯 "I have material, I want to learn directly" → Direct Input Mode

Paste an article, a song lyric, a news piece, a script — throw in any foreign language text, and the AI auto-detects the language, translates sentence by sentence, extracts vocabulary, and creates tailored learning content for you.

### 🌐 "I want to learn a foreign language using material in my native language" → Translation Learning Mode

Enter text in your native language, and the AI translates it into the language you want to learn, then generates vocabulary and exercises based on the translated text. Material you're familiar with becomes your starting point for learning a new language.

### ✨ "I don't have material, generate some for me" → AI Generation Mode

Tell the AI what topic you want to learn (e.g., "ordering coffee in daily conversation", "asking for directions while traveling"), and the AI automatically generates text in the target language, then you start learning. No material? No problem.

### 🗣️ "I want to practice listening" → Voice Narration

Based on the browser's native TTS, supporting 120+ languages. Both words and sentences can be read aloud, with free switching between normal and slow speed. Phase Two also includes dedicated listening comprehension exercises.

### 🌍 "My native language isn't English/Chinese" → Any Language Interface

Select your native language, and the entire interface is automatically translated into that language. No matter what your native language is, you can use the app without barriers.

### 📖 "Middle school reading comprehension — I want to thoroughly master an article" → Intensive Reading Mode

Put in a reading comprehension article, and the AI automatically translates sentence by sentence, extracts all new words and phrases, and generates vocabulary cards and various exercises. From word-by-word understanding to grasping the whole article, it helps you fully understand every detail.

---

## Learning System

Two-phase learning + mistake review, progressively mastering every knowledge point:

| Phase | Content | Exercise Types |
|------|------|------|
| **Phase 1 · Vocabulary Recognition** | Word cards + Sentence translation | Word selection, Sentence translation |
| **Phase 2 · Comprehensive Training** | Listening + Fill-in-the-blank + Reassembly | Listening comprehension, Masked fill-in-the-blank, Translation reassembly |

Each unit has 10 questions. After completion, you receive a ⭐ star rating. Incorrectly answered questions automatically go into mistake review until mastered.

### Phase 1 · Vocabulary Recognition

| Exercise Type | Screenshot | Description |
|------|------|------|
| Word Selection | ![Word Selection](docs/screenshots/vocab.png) | Multiple choice — see the word, pick the definition, with voice narration and phonetics |
| Sentence Translation | ![Sentence Translation](docs/screenshots/translate%20t2s.png) | See the source language sentence, assemble the translation from native language words |
| Listening Comprehension | ![Listening](docs/screenshots/listening.png) | Listen to the sentence, assemble what you heard from words, with normal/slow speed toggle |

### Phase 2 · Comprehensive Training

| Exercise Type | Screenshot | Description |
|------|------|------|
| Masked Fill-in-the-blank | ![Fill-in-the-blank](docs/screenshots/mask.png) | Key words are removed from the sentence, choose the correct answer from options |
| Translation Reassembly | ![Translation Reassembly](docs/screenshots/translate%20s2t.png) | See the native language translation, reconstruct the original sentence from target language words |

---

## Main Pages

### Home & Input

![Home](docs/screenshots/main.png)

Three input modes covering all learning scenarios:
- **Direct Input** — Paste foreign language text, AI auto-detects language, translates sentence by sentence, extracts vocabulary
- **Auto Translation** — Enter text in your native language, AI translates it to the target language before learning
- **Free Generation** — Tell the AI what topic you want to learn, it automatically generates learning content

### Dictionary Page

![Dictionary Page](docs/screenshots/contrast.png)

Sentence translation on the left, vocabulary list on the right. Click an underlined word to view details. Supports alphabetical index for quick navigation. Each word has phonetics, part of speech, definition, inflections, and example sentences.

![Word Details](docs/screenshots/contrast_detail.png)

Word details support refresh to regenerate. Memory aids help with associative memorization.

### Learning Units

![Learning Units](docs/screenshots/units.png)

Two-phase learning system with units that unlock progressively. Earn star ratings upon completion. Supports "New words only" and "Skip listening" toggles to customize your learning pace.

---

## 🚀 Quick Start

### Requirements

- Python 3.10+
- Node.js 18+
- An LLM API Key (supports OpenAI-compatible interfaces, such as SiliconFlow, DeepSeek, etc.)

### Installation & Launch

```bash
# 1. Install backend dependencies
cd backend
pip install -r requirements.txt

# 2. Start the backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 3. Install frontend dependencies
cd ../frontend
npm install

# 4. Start the frontend
npm run dev
```

Open http://localhost:5173, click the ⚙️ settings icon in the top right corner, enter your API Key, and you're ready to start learning.

---

## 🛠 Tech Stack

| Layer | Technology |
|----|------|
| Frontend | React 18 · Vite · TailwindCSS · Framer Motion · Web Speech API |
| Backend | FastAPI · Uvicorn · OpenAI-compatible LLM API |
| Storage | Local file system (zero configuration, ready to use out of the box) |

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

[GNU GPL v3 License](LICENSE)
