[中文](../README.md) | [English](README_en.md) | [日本語](README_ja.md) | [한국어](README_ko.md) | [Español](README_es.md) | **Français**

<div align="center">

# 🐸 呱邻国

**Entièrement propulsé par l'IA. Saisissez votre API, libérez votre apprentissage des langues.**

[![React](https://img.shields.io/badge/React-18-61dafb?logo=react)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.10+-3776ab?logo=python)](https://python.org)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](../LICENSE)

</div>

---

## Qu'est-ce que 呱邻国 ?

呱邻国 est une plateforme d'apprentissage des langues étrangères immersive propulsée par l'IA. Vous fournissez n'importe quel texte, l'IA génère automatiquement un glossaire, des traductions phrase par phrase et divers exercices, accompagnés de lecture vocale, transformant chaque texte en votre propre matériel d'apprentissage personnalisé.

**N'importe quelle langue → n'importe quelle langue, vos contenus, vos règles.**

**Un seul API Key suffit, tout est propulsé par la puissance des LLM.**

---

## Détails

👉 [Voir la page de présentation complète](https://rhouselyn.github.io/Guapage)

---

## Philosophie de conception centrale

### Zéro intervention manuelle, entièrement propulsé par les LLM

De l'analyse des phrases et de la segmentation des mots à la génération des définitions, **tout est géré par le LLM sans aucune règle manuelle ni dépendance à un dictionnaire**. L'IA comprend le contexte, détermine automatiquement les frontières des mots, extrait les racines, génère des définitions et des phrases d'exemple — vous fournissez simplement le texte, l'IA fait le reste.

### Format de sortie LLM élégant

Des prompts soigneusement conçus et des formats de sortie structurés garantissent que le LLM renvoie des données propres, analysables et directement utilisables. Pas besoin de corrections en post-traitement — un seul appel produit le résultat souhaité.

### Consommation minimale de tokens

En simplifiant les prompts, en compressant les formats de sortie et en éliminant les champs redondants, **la consommation de tokens est minimisée**. Le même contenu d'apprentissage est réalisé avec moins de tokens, réduisant les coûts d'API.

---

## Vidéo de démonstration

<div align="center">

<!-- Espace réservé pour la vidéo, à remplacer par la vidéo de démonstration ultérieurement -->
<!-- <video src="demo.mp4" controls width="100%"></video> -->

📹 *Vidéo de démonstration à venir*

</div>

---

## 🚀 Démarrage rapide

### Option 1 : Télécharger l'application de bureau (Recommandé)

Rendez-vous sur [GitHub Releases](https://github.com/rhouselyn/Gualingo/releases) pour télécharger l'installateur de votre plateforme :

| Plateforme | Fichier |
|------|------|
| Windows | `Gualingo-Windows.zip` |
| macOS | `Gualingo-macOS.tar.gz` |
| Linux | `Gualingo-Linux.tar.gz` |

Décompressez et lancez `Gualingo` — aucune installation de Python ou Node.js requise.

### Option 2 : Docker

```bash
docker run -d \
  -p 8000:8000 \
  -v gualingo-data:/root/.local/share/Gualingo \
  ghcr.io/rhouselyn/gualingo:latest
```

Ouvrez http://localhost:8000 pour commencer.

### Option 3 : Exécuter depuis le code source

#### Prérequis

- Python 3.10+
- Node.js 18+
- Un LLM API Key (supporte les interfaces compatibles OpenAI, telles que SiliconFlow, DeepSeek, etc.)

#### Installation et lancement

```bash
# 1. Installer les dépendances backend
cd backend
pip install -r requirements.txt

# 2. Lancer le backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 3. Installer les dépendances frontend (choisissez un style de frontend)
cd ../frontend-soft-ui
npm install

# 4. Lancer le frontend
npm run dev
```

Ouvrez http://localhost:5174, cliquez sur ⚙️ Paramètres en haut à droite pour saisir votre API Key, et vous pouvez commencer à apprendre.

#### Mode application de bureau

```bash
# Installer les dépendances de l'application de bureau
pip install pywebview

# Construire frontend-soft-ui
cd frontend-soft-ui
npm install
npm run build
cd ..

# Lancer l'application de bureau
python app.py
```

---

## 🛠 Stack technique

| Couche | Technologies |
|--------|-------------|
| Frontend | React 18 · Vite · TailwindCSS · Framer Motion · Web Speech API |
| Backend | FastAPI · Uvicorn · API LLM compatible OpenAI |
| Stockage | SQLite (migration automatique des anciens fichiers de données) |
| Bureau | PyWebView · PyInstaller |

---

## 📖 Flux d'utilisation

```
Saisir le texte → Traduction phrase par phrase par l'IA → Génération du glossaire → Phase 1 : Apprendre le vocabulaire → Phase 2 : S'entraîner sur les phrases → Révision des erreurs
```

1. **Saisir le texte** : collez directement, traduisez vers la langue cible, ou laissez l'IA générer
2. **Parcourir le dictionnaire** : consultez les traductions phrase par phrase et les définitions du vocabulaire, accédez à tout moment à n'importe quel mot
3. **Phase 1** : choix de vocabulaire, traduction de phrases, compréhension orale
4. **Phase 2** : texte à trous, reconstitution de traduction
5. **Révision des erreurs** : les questions auxquelles vous avez mal répondu sont automatiquement collectées, entraînement renforcé jusqu'à maîtrise

---

## ⚙️ Configuration

Toute la configuration se fait via les paramètres de l'interface, pas besoin de modifier des fichiers de configuration :

- **API Key** : supporte la rotation de plusieurs configurations, basculement automatique en cas de limitation de débit
- **Langue maternelle** : choisissez la langue d'affichage de l'interface
- **Nombre par page** : contrôle le nombre de mots affichés par page dans le glossaire
- **Intervalle de relance** : temps d'attente après une limitation de débit de l'API

---

## 📄 Licence

[GNU Affero General Public License v3](../LICENSE)
