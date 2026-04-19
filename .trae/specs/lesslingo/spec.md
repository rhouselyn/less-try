# Lesslingo - Product Requirement Document

## Overview
- **Summary**: Lesslingo is a fully local web-based language learning system centered around AI agents, generating all learning content in real-time without pre-collected language databases.
- **Purpose**: To provide a privacy-focused, flexible language learning platform that leverages AI for personalized content generation and adaptive learning paths.
- **Target Users**: Language learners of all levels who value privacy, flexibility, and AI-powered personalized learning experiences.

## Goals
- Create a fully local language learning system with no cloud dependencies
- Implement multi-modal input support (text, audio, images)
- Develop adaptive learning stages with dynamic content generation
- Provide a clean, minimalist user interface inspired by Anthropic's design
- Enable flexible language pair selection for learning

## Non-Goals (Out of Scope)
- Cloud-based storage or synchronization
- User accounts or registration
- Pre-built language databases
- Mobile app development
- Social features or community aspects

## Background & Context
- Lesslingo leverages Claude Haiku 4.5 for AI capabilities including text generation, speech recognition, and synthesis
- The system uses a local file-based storage approach with JSON files and audio/image assets
- The learning process is divided into three distinct stages with progressive difficulty
- The platform prioritizes privacy and offline functionality

## Functional Requirements
- **FR-1**: Local file-based storage system for user progress, prompts, and uploaded files
- **FR-2**: Multi-modal input support (text, audio via Whisper, images via OCR)
- **FR-3**: Dynamic content generation using NVIDIA's minimax-m2.7 model
- **FR-4**: Three-stage learning process with adaptive content
- **FR-5**: Real-time text processing including tokenization, translation, and vocabulary extraction
- **FR-6**: Speech recognition and synthesis for listening and speaking exercises
- **FR-7**: Interactive quiz generation with multiple question types
- **FR-8**: Progress tracking and mistake collection system
- **FR-9**: Language入口页 with file management and language selection
- **FR-10**: Dynamic clustering visualization of language relationships on the homepage

## Non-Functional Requirements
- **NFR-1**: Performance - Responsive UI with minimal latency for AI-generated content
- **NFR-2**: Privacy - All data stored locally, no external data transmission
- **NFR-3**: Reliability - Robust error handling and graceful degradation
- **NFR-4**: Usability - Intuitive interface with clear navigation and feedback
- **NFR-5**: Accessibility - Support for different learning styles and abilities
- **NFR-6**: Scalability - Ability to handle large input files and extensive vocabulary

## Constraints
- **Technical**: Claude Haiku 4.5 API dependency for AI capabilities
- **Technical**: Local file system storage limitations
- **Technical**: API rate limits for TTS generation
- **Business**: No external cloud services
- **Dependencies**: Python FastAPI, React/Vue, TailwindCSS, shadcn/ui, Motion

## Assumptions
- Users have access to a Claude Haiku 4.5 API endpoint
- Users have sufficient local storage for audio and image files
- Users are comfortable with local web application usage
- Python and web development environment is available for setup

## Acceptance Criteria

### AC-1: Local Storage System
- **Given**: User uploads a text file for learning
- **When**: The system processes the file
- **Then**: All data is stored locally in the specified directory structure
- **Verification**: `programmatic`
- **Notes**: Verify JSON files are created and structured correctly

### AC-2: Multi-modal Input Support
- **Given**: User provides text, audio, or image input
- **When**: The system processes the input
- **Then**: All input types are correctly converted to text for processing
- **Verification**: `programmatic`
- **Notes**: Test with different input types and languages

### AC-3: Vocabulary Extraction and Processing
- **Given**: User inputs text for learning
- **When**: The system processes the text
- **Then**: Vocabulary is extracted, grouped, and enriched with meanings, phonetics, and examples
- **Verification**: `programmatic`
- **Notes**: Verify 10-word grouping and JSON output format

### AC-4: Three-Stage Learning Process
- **Given**: User completes stage 1
- **When**: The system progresses to stage 2
- **Then**: Adaptive learning content is generated based on user progress
- **Verification**: `human-judgment`
- **Notes**: Test progression logic and content adaptation

### AC-5: Quiz Generation
- **Given**: User reaches a quiz section
- **When**: The system generates quiz questions
- **Then**: Questions are varied, appropriate to level, and include proper distractors
- **Verification**: `human-judgment`
- **Notes**: Test question quality and relevance

### AC-6: Speech Recognition and Synthesis
- **Given**: User completes a speaking exercise
- **When**: The system processes the audio
- **Then**: Speech is accurately recognized and compared to target
- **Verification**: `programmatic`
- **Notes**: Test with different accents and speaking speeds

### AC-7: User Interface
- **Given**: User interacts with the application
- **When**: The system displays content
- **Then**: Interface is clean, responsive, and follows Anthropic's design style
- **Verification**: `human-judgment`
- **Notes**: Evaluate visual design and user experience

## Open Questions
- [ ] What specific NVIDIA API endpoints and authentication methods are required?
- [ ] How to handle different accents in speech recognition?
- [ ] What fallback mechanisms should be implemented for API failures?
- [ ] How to optimize TTS generation to avoid rate limiting?
- [ ] What specific clustering algorithm should be used for language relationships visualization?