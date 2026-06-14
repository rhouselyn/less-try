[中文](../README.md) | [English](README_en.md) | [日本語](README_ja.md) | [한국어](README_ko.md) | **Español** | [Français](README_fr.md)

<div align="center">

# 🐸 呱邻国

**Completamente impulsado por IA. Ingresa tu API, logra libertad lingüística.**

[![React](https://img.shields.io/badge/React-18-61dafb?logo=react)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.10+-3776ab?logo=python)](https://python.org)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](../LICENSE)

</div>

---

## ¿Qué es 呱邻国?

呱邻国 es una plataforma inmersiva de aprendizaje de idiomas extranjeros impulsada por IA. Proporcionas cualquier texto y la IA genera automáticamente un vocabulario, traducción por oraciones y múltiples ejercicios, junto con lectura en voz alta, convirtiendo cada texto en tu material de estudio personalizado.

**Cualquier idioma → cualquier idioma, tú decides el material.**

**Solo necesitas una API Key, todo impulsado por la capacidad pura de los LLM.**

---

## Detalles

👉 [Ver la página de introducción completa](https://rhouselyn.github.io/Guapage)

---

## Filosofía de diseño central

### Cero intervención manual, impulsado puramente por LLM

Desde el análisis de oraciones y la segmentación de palabras hasta la generación de definiciones, **todo es manejado por el LLM sin reglas manuales ni dependencias de diccionarios**. La IA comprende el contexto, determina automáticamente los límites de las palabras, extrae raíces, genera definiciones y oraciones de ejemplo — solo proporciona el texto, la IA hace el resto.

### Formato de salida LLM elegante

Prompts cuidadosamente diseñados y formatos de salida estructurados aseguran que el LLM devuelva datos limpios, analizables y directamente utilizables. Sin necesidad de correcciones posteriores — una sola llamada produce el resultado deseado.

### Consumo mínimo de tokens

Simplificando prompts, comprimiendo formatos de salida y eliminando campos redundantes, **el consumo de tokens se minimiza**. El mismo contenido de aprendizaje se completa con menos tokens, reduciendo los costos de API.

---

## Video de demostración

<div align="center">

<!-- Marcador de video, reemplazar con el video de demostración real más adelante -->
<!-- <video src="demo.mp4" controls width="100%"></video> -->

📹 *Video de demostración próximamente*

</div>

---

## 🚀 Inicio rápido

### Opción 1: Descargar la aplicación de escritorio (Recomendado)

Ve a [GitHub Releases](https://github.com/rhouselyn/Gualingo/releases) para descargar el instalador de tu plataforma:

| Plataforma | Archivo |
|------|------|
| Windows | `Gualingo-Windows.zip` |
| macOS | `Gualingo-macOS.tar.gz` |
| Linux | `Gualingo-Linux.tar.gz` |

Extrae y ejecuta `Gualingo` — no requiere instalación de Python o Node.js.

### Opción 2: Docker

```bash
docker run -d \
  -p 8000:8000 \
  -v gualingo-data:/root/.local/share/Gualingo \
  ghcr.io/rhouselyn/gualingo:latest
```

Abre http://localhost:8000 para comenzar a usar.

### Opción 3: Ejecutar desde el código fuente

#### Requisitos del entorno

- Python 3.10+
- Node.js 18+
- Una LLM API Key (soporta interfaces compatibles con OpenAI, como SiliconFlow, DeepSeek, etc.)

#### Instalación e inicio

```bash
# 1. Instalar dependencias del backend
cd backend
pip install -r requirements.txt

# 2. Iniciar el backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 3. Instalar dependencias del frontend (elige un estilo de frontend)
cd ../frontend-soft-ui
npm install

# 4. Iniciar el frontend
npm run dev
```

Abre http://localhost:5174, haz clic en ⚙️ Configuración en la esquina superior derecha e ingresa tu API Key para comenzar a aprender.

#### Modo de aplicación de escritorio

```bash
# Instalar dependencias de la aplicación de escritorio
pip install pywebview

# Construir frontend-soft-ui
cd frontend-soft-ui
npm install
npm run build
cd ..

# Iniciar la aplicación de escritorio
python app.py
```

---

## 🛠 Stack tecnológico

| Capa | Tecnología |
|----|------|
| Frontend | React 18 · Vite · TailwindCSS · Framer Motion · Web Speech API |
| Backend | FastAPI · Uvicorn · API LLM compatible con OpenAI |
| Almacenamiento | SQLite (migración automática de datos de archivos anteriores) |
| Escritorio | PyWebView · PyInstaller |

---

## 📖 Flujo de uso

```
Ingresar texto → Traducción por oraciones por IA → Generar vocabulario → Fase 1: Aprender palabras → Fase 2: Practicar oraciones → Repaso de errores
```

1. **Ingresar texto**: Pega directamente, traduce al idioma objetivo, o deja que la IA lo genere
2. **Explorar el diccionario**: Consulta la traducción por oraciones y las definiciones del vocabulario, revisa cualquier palabra en cualquier momento
3. **Fase 1**: Selección de palabras, traducción de oraciones, comprensión auditiva
4. **Fase 2**: Rellenar espacios con palabras ocultas, reorganización de traducción
5. **Repaso de errores**: Las preguntas incorrectas se recopilan automáticamente, práctica de refuerzo hasta dominarlas

---

## ⚙️ Configuración

Toda la configuración se realiza desde la interfaz, sin necesidad de editar archivos de configuración:

- **API Key**: Soporta rotación de múltiples configuraciones, cambio automático ante limitación de velocidad
- **Idioma materno**: Selecciona el idioma de visualización de la interfaz
- **Cantidad por página**: Controla la cantidad de palabras mostradas por página en el vocabulario
- **Intervalo de reintento**: Tiempo de espera después de la limitación de velocidad de la API

---

## 📄 Licencia

[GNU Affero General Public License v3](../LICENSE)
