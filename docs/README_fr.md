[中文](../README.md) | [English](README_en.md) | [日本語](README_ja.md) | [한국어](README_ko.md) | [Español](README_es.md) | **Français**

<div align="center">

# 🐸 呱邻国

**Entièrement propulsé par l'IA. Saisissez votre API, libérez votre apprentissage des langues.**

[![React](https://img.shields.io/badge/React-18-61dafb?logo=react)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.10+-3776ab?logo=python)](https://python.org)
[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](LICENSE)

</div>

---

## Qu'est-ce que 呱邻国 ?

呱邻国 est une plateforme d'apprentissage des langues étrangères immersive propulsée par l'IA. Vous fournissez n'importe quel texte, l'IA génère automatiquement un glossaire, des traductions phrase par phrase et divers exercices, accompagnés de lecture vocale, transformant chaque texte en votre propre matériel d'apprentissage personnalisé.

**N'importe quelle langue → n'importe quelle langue, vos contenus, vos règles.**

**Un seul API Key suffit, pas de base de données, tout est propulsé par la puissance des LLM.**

---

## Ce que Duolingo ne peut pas faire, 呱邻国 le fait

| Les limites de Duolingo | La solution de 呱邻国 |
|--------------------------|------------------------|
| **Pas de liste de vocabulaire, impossible de réviser** | Génération automatique d'un glossaire complet, avec index alphabétique, recherche et détails mot par mot — consultez à tout moment la définition, la phonétique, les déclinaisons et les exemples de chaque mot |
| **Envie de chercher un autre mot pendant un exercice** | Ouvrez le glossaire à tout moment pendant l'apprentissage, consultez la définition et les détails de n'importe quel mot sans interrompre votre rythme |
| **Difficile d'appliquer ce qu'on a appris** | Vous apprenez ce que vous fournissez — paroles de chansons, actualités, répliques, articles scientifiques — ce que vous apprenez est ce que vous rencontrerez réellement |
| **Les langues minoritaires ne sont pas supportées** | Apprentissage mutuel entre toutes les langues, détection automatique par l'IA, lecture TTS en 120+ langues, plus limité par les ressources de la plateforme |
| **Impossible d'approfondir la compréhension d'un article** | Importez l'article, l'IA traduit phrase par phrase, extrait tout le vocabulaire et génère des exercices — du mot à la phrase à l'article entier, maîtrisez chaque texte en profondeur |

---

## Comment ça répond à vos besoins ?

### 🎯 « J'ai du contenu, je veux apprendre directement » → Mode saisie directe

Collez un article, des paroles de chanson, des actualités, des répliques — importez n'importe quel texte en langue étrangère, l'IA détecte automatiquement la langue, traduit phrase par phrase, extrait le vocabulaire et crée du contenu d'apprentissage sur mesure pour vous.

### 🌐 « Je veux apprendre une langue étrangère à partir de contenu dans ma langue maternelle » → Mode traduction-apprentissage

Saisissez un texte dans votre langue maternelle, l'IA le traduit dans la langue que vous souhaitez apprendre, puis génère du vocabulaire et des exercices à partir du texte traduit. Votre contenu familier devient votre point de départ pour apprendre une langue étrangère.

### ✨ « Je n'ai pas de contenu, générez-le pour moi » → Mode génération IA

Dites à l'IA quel sujet vous voulez apprendre (par exemple « dialogues pour commander un café », « situations de demande de direction en voyage »), l'IA génère automatiquement un texte dans la langue cible, puis l'apprentissage commence. Apprenez même sans contenu.

### 🗣️ « Je veux m'entraîner à la compréhension orale » → Lecture vocale

Basée sur le TTS natif du navigateur, prenant en charge 120+ langues. Mots et phrases peuvent être lus, avec changement libre entre vitesse normale et lente. La phase 2 propose également des exercices dédiés de compréhension orale.

### 🌍 « Ma langue maternelle n'est ni l'anglais ni le chinois » → Interface en toute langue

Choisissez votre langue maternelle, toute l'interface se traduit automatiquement dans cette langue. Quelle que soit votre langue maternelle, vous pouvez utiliser l'application sans obstacle.

### 📖 « Compréhension écrite au collège, je veux maîtriser un texte en profondeur » → Mode lecture approfondie

Importez le texte de compréhension écrite, l'IA traduit automatiquement phrase par phrase, extrait tous les mots et expressions nouveaux, génère des cartes de vocabulaire et divers exercices. De la compréhension mot par mot à la maîtrise de l'ensemble, aidez-vous à comprendre chaque détail d'un texte.

---

## Système d'apprentissage

Apprentissage en deux phases + révision des erreurs, progression graduelle pour maîtriser chaque point de connaissance :

| Phase | Contenu | Types d'exercices |
|-------|---------|-------------------|
| **Phase 1 · Acquisition du vocabulaire** | Cartes de vocabulaire + Traduction de phrases | Choix de vocabulaire, traduction de phrases |
| **Phase 2 · Entraînement approfondi** | Compréhension orale + Texte à trous + Reconstitution | Compréhension orale, texte à trous, reconstitution de traduction |

Chaque unité comporte 10 questions, à la fin vous obtenez une évaluation ⭐, les questions auxquelles vous avez mal répondu entrent automatiquement en révision des erreurs, jusqu'à ce que vous les maîtrisiez.

### Phase 1 · Acquisition du vocabulaire

| Type d'exercice | Capture d'écran | Description |
|-----------------|-----------------|-------------|
| Choix de vocabulaire | ![Choix de vocabulaire](screenshots/vocab.png) | QCM à quatre choix, lisez le mot et choisissez la définition, avec lecture vocale et phonétique |
| Traduction de phrases | ![Traduction de phrases](screenshots/translate%20t2s.png) | Lisez la phrase en langue source, reconstituez la traduction à partir des mots de votre langue maternelle |
| Compréhension orale | ![Compréhension orale](screenshots/listening.png) | Écoutez la phrase, reconstituez ce que vous avez entendu à partir des mots, avec changement vitesse normale/lente |

### Phase 2 · Entraînement approfondi

| Type d'exercice | Capture d'écran | Description |
|-----------------|-----------------|-------------|
| Texte à trous | ![Texte à trous](screenshots/mask.png) | Un mot-clé est masqué dans la phrase, choisissez la bonne réponse parmi les options |
| Reconstitution de traduction | ![Reconstitution de traduction](screenshots/translate%20s2t.png) | Lisez la traduction dans votre langue maternelle, reconstituez la phrase originale à partir des mots de la langue cible |

---

## Pages principales

### Page d'accueil & Saisie

![Page d'accueil](screenshots/main.png)

Trois modes de saisie, couvrant tous les scénarios d'apprentissage :
- **Saisie directe** — Collez un texte en langue étrangère, l'IA détecte la langue, traduit phrase par phrase et extrait le vocabulaire
- **Traduction automatique** — Saisissez un texte dans votre langue maternelle, l'IA le traduit dans la langue cible puis lance l'apprentissage
- **Génération libre** — Dites à l'IA quel sujet vous voulez apprendre, elle génère automatiquement le contenu d'apprentissage

### Page dictionnaire

![Page dictionnaire](screenshots/contrast.png)

Traduction des phrases à gauche, glossaire à droite, cliquez sur un mot souligné pour voir ses détails. Index alphabétique pour une localisation rapide, chaque mot est accompagné de sa phonétique, sa nature grammaticale, sa définition, ses déclinaisons et ses exemples.

![Détail du mot](screenshots/contrast_detail.png)

Les détails du mot supportent la régénération par actualisation, les aides mnémotechniques facilitent la mémoration associative.

### Unités d'apprentissage

![Unités d'apprentissage](screenshots/units.png)

Système d'apprentissage en deux phases, les unités se déverrouillent progressivement, obtenez une évaluation par étoiles après complétion. Options « apprendre uniquement les nouveaux mots » et « passer l'écoute » pour personnaliser votre rythme d'apprentissage selon vos besoins.

---

## 🚀 Démarrage rapide

### Prérequis

- Python 3.10+
- Node.js 18+
- Un LLM API Key (supporte les interfaces compatibles OpenAI, telles que SiliconFlow, DeepSeek, etc.)

### Installation et lancement

```bash
# 1. Installer les dépendances backend
cd backend
pip install -r requirements.txt

# 2. Lancer le backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 3. Installer les dépendances frontend
cd ../frontend
npm install

# 4. Lancer le frontend
npm run dev
```

Ouvrez http://localhost:5173, cliquez sur ⚙️ Paramètres en haut à droite pour saisir votre API Key, et vous pouvez commencer à apprendre.

---

## 🛠 Stack technique

| Couche | Technologies |
|--------|-------------|
| Frontend | React 18 · Vite · TailwindCSS · Framer Motion · Web Speech API |
| Backend | FastAPI · Uvicorn · API LLM compatible OpenAI |
| Stockage | Système de fichiers local (zéro configuration, prêt à l'emploi) |

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

[GNU GPL v3 License](LICENSE)
