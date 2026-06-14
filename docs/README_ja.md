[中文](../README.md) | [English](README_en.md) | **日本語** | [한국어](README_ko.md) | [Español](README_es.md) | [Français](README_fr.md)

<div align="center">

# 🐸 Gualingo

**完全に AI 駆動。API を入力して、言語の自由を実現。**

[![React](https://img.shields.io/badge/React-18-61dafb?logo=react)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.10+-3776ab?logo=python)](https://python.org)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](../LICENSE)

</div>

---

## Gualingoとは？

Gualingoは、AI 駆動の没入型外国語学習プラットフォームです。あなたが任意のテキストを提供すると、AI が自動的に語彙表、文ごとの翻訳、多様な練習問題を生成し、音声読み上げと組み合わせて、あらゆる文章をあなた専用の学習教材に変えます。

**どんな言語 → どんな言語へ、教材はあなた次第。**

**API キー一つだけで、純粋な LLM の力ですべてを駆動。**

---

## 詳細紹介

👉 [完全な紹介ページを見る](https://rhouselyn.github.io/Guapage)

---

## 核心設計理念

### ゼロの手作業、純粋な LLM 駆動

文の解析、単語の分割から定義の生成まで、**すべて LLM が処理し、手動のルールや辞書への依存は一切ありません**。AI が文脈を理解し、自動的に単語の境界を判断、語根を抽出、定義と例文を生成します——テキストを提供するだけで、あとは AI にお任せ。

### エレガントな LLM 出力フォーマット

慎重に設計されたプロンプトと構造化出力フォーマットにより、LLM が返すデータはクリーンで解析可能、そのまま使用できます。後処理による修正に依存せず、一度の呼び出しで必要な結果を得られます。

### 極限のトークン節約

プロンプトの簡素化、出力フォーマットの圧縮、冗長なフィールドの排除により、**トークン消費を最小限に抑えます**。同じ学習内容をより少ないトークンで完了し、API コストを削減。

---

## デモ動画

<div align="center">

<!-- 動画プレースホルダー、後で実際のデモ動画に差し替え -->
<!-- <video src="demo.mp4" controls width="100%"></video> -->

📹 *デモ動画は近日公開*

</div>

---

## 🚀 クイックスタート

### 方法1：デスクトップアプリをダウンロード（推奨）

[GitHub Releases](https://github.com/rhouselyn/Gualingo/releases) からプラットフォームに合ったインストーラーをダウンロード：

| プラットフォーム | ファイル |
|------|------|
| Windows | `Gualingo-Windows.zip` |
| macOS | `Gualingo-macOS.tar.gz` |
| Linux | `Gualingo-Linux.tar.gz` |

解凍して `Gualingo` を実行するだけで、Python や Node.js のインストールは不要です。

### 方法2：Docker

```bash
docker run -d \
  -p 8000:8000 \
  -v gualingo-data:/root/.local/share/Gualingo \
  ghcr.io/rhouselyn/gualingo:latest
```

http://localhost:8000 を開くだけで利用可能。

### 方法3：ソースから実行

#### 環境要件

- Python 3.10+
- Node.js 18+
- LLM API キー（OpenAI 互換インターフェース対応、SiliconFlow、DeepSeek など）

#### インストールと起動

```bash
# 1. バックエンドの依存関係をインストール
cd backend
pip install -r requirements.txt

# 2. バックエンドを起動
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 3. フロントエンドの依存関係をインストール（フロントエンドスタイルを選択）
cd ../frontend-soft-ui
npm install

# 4. フロントエンドを起動
npm run dev
```

http://localhost:5174 を開き、右上の ⚙️ 設定から API キーを入力すれば、学習を開始できます。

#### デスクトップアプリモード

```bash
# デスクトップアプリの依存関係をインストール
pip install pywebview

# frontend-soft-ui をビルド
cd frontend-soft-ui
npm install
npm run build
cd ..

# デスクトップアプリを起動
python app.py
```

---

## 🛠 技術スタック

| レイヤー | 技術 |
|----|------|
| フロントエンド | React 18 · Vite · TailwindCSS · Framer Motion · Web Speech API |
| バックエンド | FastAPI · Uvicorn · OpenAI 互換 LLM API |
| ストレージ | SQLite（旧ファイルデータを自動移行） |
| デスクトップ | PyWebView · PyInstaller |

---

## 📖 利用フロー

```
テキスト入力 → AI 文ごと翻訳 → 語彙表生成 → フェーズ1：単語学習 → フェーズ2：文練習 → 間違いレビュー
```

1. **テキスト入力**：直接貼り付け、ターゲット言語に翻訳、または AI に生成させる
2. **辞書閲覧**：文ごとの翻訳と語彙の意味を確認、いつでも任意の単語を参照
3. **フェーズ1**：単語選択、文翻訳、リスニング理解
4. **フェーズ2**：穴埋め、翻訳並べ替え
5. **間違いレビュー**：間違えた問題を自動収集、習得するまで強化練習

---

## ⚙️ 設定

すべての設定はインターフェースから完了、設定ファイルの編集不要：

- **API キー**：複数設定のローテーションに対応、レート制限時に自動切り替え
- **母語**：インターフェースの表示言語を選択
- **ページあたりの数量**：語彙表の1ページあたりの単語数を制御
- **リトライ間隔**：API レート制限後の待機時間

---

## 📄 ライセンス

[GNU Affero General Public License v3](../LICENSE)
