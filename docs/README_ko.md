[中文](../README.md) | [English](README_en.md) | [日本語](README_ja.md) | **한국어** | [Español](README_es.md) | [Français](README_fr.md)

<div align="center">

# 🐸 과링고

**완전히 AI로 구동됩니다. API만 입력하면, 언어의 자유를 실현하세요.**

[![React](https://img.shields.io/badge/React-18-61dafb?logo=react)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.10+-3776ab?logo=python)](https://python.org)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](../LICENSE)

</div>

---

## 과링고은 무엇인가요?

과링고은 AI 기반의 몰입형 외국어 학습 플랫폼입니다. 어떤 텍스트든 제공하면, AI가 자동으로 어휘표, 문장별 번역, 다양한 연습 문제를 생성하고 음성 읽기까지 지원하여, 모든 글을 나만의 학습 자료로 만들어줍니다.

**어떤 언어 → 어떤 언어, 당신의 소재는 당신이 결정합니다.**

**API Key 하나만 있으면 됩니다. 순수 LLM 능력으로 모든 것을 구동합니다.**

---

## 상세 소개

👉 [전체 소개 페이지 보기](https://rhouselyn.github.io/Guapage)

---

## 핵심 설계 철학

### 제로 수동 개입, 순수 LLM 구동

문장 분석, 단어 분할부터 정의 생성까지, **모두 LLM이 처리하며 수동 규칙이나 사전 의존이 전혀 없습니다**. AI가 문맥을 이해하고 자동으로 단어 경계를 판단, 어근을 추출, 정의와 예문을 생성합니다 — 텍스트만 제공하면 나머지는 AI가 알아서 합니다.

### 우아한 LLM 출력 형식

정교하게 설계된 프롬프트와 구조화된 출력 형식으로 LLM이 반환하는 데이터는 깔끔하고 파싱 가능하며 바로 사용할 수 있습니다. 후처리 수정에 의존하지 않고 한 번의 호출로 원하는 결과를 얻습니다.

### 극한의 토큰 절약

프롬프트 간소화, 출력 형식 압축, 중복 필드 제거를 통해 **토큰 소비를 최소화**합니다. 같은 학습 콘텐츠를 더 적은 토큰으로 완료하여 API 비용을 절감합니다.

---

## 데모 영상

<div align="center">

<!-- 영상 플레이스홀더, 나중에 실제 데모 영상으로 교체 -->
<!-- <video src="demo.mp4" controls width="100%"></video> -->

📹 *데모 영상 공개 예정*

</div>

---

## 🚀 빠른 시작

### 방법 1: 데스크톱 앱 다운로드 (권장)

[GitHub Releases](https://github.com/rhouselyn/Gualingo/releases)에서 플랫폼에 맞는 설치 파일을 다운로드하세요:

| 플랫폼 | 파일 |
|------|------|
| Windows | `Gualingo-Windows.zip` |
| macOS | `Gualingo-macOS.tar.gz` |
| Linux | `Gualingo-Linux.tar.gz` |

압축 해제 후 `Gualingo`을 실행하면 됩니다. Python이나 Node.js 설치가 필요하지 않습니다.

### 방법 2: Docker

```bash
docker run -d \
  -p 8000:8000 \
  -v gualingo-data:/root/.local/share/Gualingo \
  ghcr.io/rhouselyn/gualingo:latest
```

http://localhost:8000을 열면 바로 사용할 수 있습니다.

### 방법 3: 소스에서 실행

#### 환경 요구사항

- Python 3.10+
- Node.js 18+
- LLM API Key 하나 (OpenAI 호환 인터페이스 지원, 예: SiliconFlow, DeepSeek 등)

#### 설치 및 실행

```bash
# 1. 백엔드 의존성 설치
cd backend
pip install -r requirements.txt

# 2. 백엔드 실행
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 3. 프론트엔드 의존성 설치 (프론트엔드 스타일 선택)
cd ../frontend-soft-ui
npm install

# 4. 프론트엔드 실행
npm run dev
```

http://localhost:5174을 열고, 우측 상단 ⚙️ 설정에서 API Key를 입력하면 학습을 시작할 수 있습니다.

#### 데스크톱 앱 모드

```bash
# 데스크톱 앱 의존성 설치
pip install pywebview

# frontend-soft-ui 빌드
cd frontend-soft-ui
npm install
npm run build
cd ..

# 데스크톱 앱 실행
python app.py
```

---

## 🛠 기술 스택

| 계층 | 기술 |
|----|------|
| 프론트엔드 | React 18 · Vite · TailwindCSS · Framer Motion · Web Speech API |
| 백엔드 | FastAPI · Uvicorn · OpenAI 호환 LLM API |
| 저장 | SQLite (기존 파일 데이터 자동 마이그레이션) |
| 데스크톱 | PyWebView · PyInstaller |

---

## 📖 사용 흐름

```
텍스트 입력 → AI 문장별 번역 → 어휘표 생성 → 1단계: 단어 학습 → 2단계: 문장 연습 → 오답 복습
```

1. **텍스트 입력**: 직접 붙여넣기, 목표 언어로 번역, 또는 AI가 생성
2. **사전 탐색**: 문장별 번역과 어휘 뜻을 확인, 언제든 어떤 단어든查阅
3. **1단계**: 단어 선택, 문장 번역, 듣기 이해
4. **2단계**: 빈칸 채우기, 번역 재구성
5. **오답 복습**: 틀린 문제가 자동 수집되어 마스터할 때까지 강화 연습

---

## ⚙️ 설정

모든 설정은 인터페이스에서 완료되며, 설정 파일 편집 불필요:

- **API Key**: 여러 그룹 설정 로테이션 지원, 속도 제한 시 자동 전환
- **모국어**: 인터페이스 표시 언어 선택
- **페이지당 수량**: 어휘표 페이지당 표시할 단어 수 제어
- **재시도 간격**: API 속도 제한 후 대기 시간

---

## 📄 라이선스

[GNU Affero General Public License v3](../LICENSE)
