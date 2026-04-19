# Lesslingo - The Implementation Plan (Decomposed and Prioritized Task List)

## [x] Task 1: Project Setup and Basic Infrastructure
- **Priority**: P0
- **Depends On**: None
- **Description**:
  - Set up project directory structure
  - Configure Python FastAPI backend
  - Set up React/Vue frontend with TailwindCSS
  - Establish basic API endpoints
- **Acceptance Criteria Addressed**: AC-1, AC-7
- **Test Requirements**:
  - `programmatic` TR-1.1: Verify backend server starts successfully ✅
  - `programmatic` TR-1.2: Verify frontend builds without errors ✅
  - `human-judgment` TR-1.3: Evaluate project structure organization ✅
- **Notes**: Focus on minimal viable setup with basic folder structure

## [x] Task 2: Local Storage System Implementation
- **Priority**: P0
- **Depends On**: Task 1
- **Description**:
  - Implement directory structure creation
  - Develop JSON file writing/reading utilities
  - Create data models for storage
  - Implement file upload handling
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-2.1: Verify directory structure is created correctly ✅
  - `programmatic` TR-2.2: Verify JSON files are written and read properly ✅
  - `programmatic` TR-2.3: Test file upload functionality ✅
- **Notes**: Follow the specified directory structure from the requirements

## [x] Task 3: Core Text Processing Pipeline
- **Priority**: P0
- **Depends On**: Task 2
- **Description**:
  - Implement basic text input interface
  - Develop sentence segmentation
  - Create translation functionality using LLM
  - Implement tokenization and vocabulary extraction
  - Add 10-word grouping logic
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-3.1: Verify text is correctly segmented into sentences ✅
  - `programmatic` TR-3.2: Verify vocabulary extraction and grouping ✅
  - `programmatic` TR-3.3: Test translation accuracy ✅
- **Notes**: Focus on basic text processing first, then expand to other input types

## [x] Task 4: Agent Tool Definition and Implementation
- **Priority**: P0
- **Depends On**: Task 3
- **Description**:
  - Define generate_dictionary tool schema
  - Implement LLM integration with Claude Haiku 4.5 API
  - Develop JSON response parsing
  - Create vocabulary enrichment pipeline
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-4.1: Verify tool schema is correctly defined ✅
  - `programmatic` TR-4.2: Test LLM integration with sample inputs ✅
  - `programmatic` TR-4.3: Verify JSON response format ✅
- **Notes**: Ensure temperature=0 for consistent results

## [x] Task 5: Frontend Dictionary UI
- **Priority**: P1
- **Depends On**: Task 4
- **Description**:
  - Create dual-column dictionary layout
  - Implement word list with random sorting
  - Develop word detail cards with phonetics, meanings, and examples
  - Add interactive elements for word selection
- **Acceptance Criteria Addressed**: AC-3, AC-7
- **Test Requirements**:
  - `human-judgment` TR-5.1: Evaluate UI design and usability ✅
  - `programmatic` TR-5.2: Test word detail display functionality ✅
  - `programmatic` TR-5.3: Verify random sorting of words ✅
- **Notes**: Follow Anthropic's design style for clean, minimalist interface

## [x] Task 6: Quiz Generation Tools
- **Priority**: P1
- **Depends On**: Task 4
- **Description**:
  - Define generate_multiple_choice tool schema
  - Define generate_matching tool schema
  - Implement quiz question generation
  - Develop distractor creation logic
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `programmatic` TR-6.1: Verify multiple choice question generation ✅
  - `programmatic` TR-6.2: Test matching question generation ✅
  - `human-judgment` TR-6.3: Evaluate question quality and distractors ✅
- **Notes**: Ensure questions are contextually relevant to the learning material

## [x] Task 7: Snapshot Mechanism for防漂移
- **Priority**: P1
- **Depends On**: Task 6
- **Description**:
  - Implement snapshot.json creation
  - Develop snapshot reading functionality
  - Create quiz state management
  - Test navigation between questions
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `programmatic` TR-7.1: Verify snapshots are created correctly ✅
  - `programmatic` TR-7.2: Test navigation using snapshots ✅
  - `programmatic` TR-7.3: Verify state consistency ✅
- **Notes**: Critical for preventing content drift in quiz questions

## [x] Task 8: Dynamic Learning Engine (Stage 2)
- **Priority**: P1
- **Depends On**: Task 7
- **Description**:
  - Implement CheckCoverage algorithm
  - Develop 8-word module progression
  - Create dynamic sentence generation
  - Implement quiz logic for stage 2
- **Acceptance Criteria Addressed**: AC-4, AC-5
- **Test Requirements**:
  - `programmatic` TR-8.1: Test CheckCoverage algorithm ✅
  - `programmatic` TR-8.2: Verify module progression logic ✅
  - `human-judgment` TR-8.3: Evaluate learning flow ✅
- **Notes**: Core logic for adaptive learning experience

## [ ] Task 9: Multi-modal Input Support
- **Priority**: P2
- **Depends On**: Task 3
- **Description**:
  - Implement audio input handling
  - Integrate Whisper for speech-to-text
  - Add image input and OCR processing
  - Develop input normalization
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `programmatic` TR-9.1: Test audio input processing
  - `programmatic` TR-9.2: Verify OCR functionality
  - `programmatic` TR-9.3: Test input normalization
- **Notes**: Build on existing text processing pipeline

## [ ] Task 10: Speech Recognition and Synthesis
- **Priority**: P2
- **Depends On**: Task 9
- **Description**:
  - Integrate TTS for audio generation
  - Implement speech recognition for speaking exercises
  - Develop pronunciation evaluation
  - Add audio playback controls
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `programmatic` TR-10.1: Test TTS audio generation
  - `programmatic` TR-10.2: Verify speech recognition accuracy
  - `programmatic` TR-10.3: Test pronunciation evaluation
- **Notes**: Implement rate limiting to avoid API restrictions

## [ ] Task 11: Language入口页 and File Management
- **Priority**: P1
- **Depends On**: Task 2
- **Description**:
  - Create language selection interface
  - Implement file upload component
  - Develop file list with progress tracking
  - Add language introduction pages
- **Acceptance Criteria Addressed**: AC-1, AC-7
- **Test Requirements**:
  - `human-judgment` TR-11.1: Evaluate language selection interface
  - `programmatic` TR-11.2: Test file upload functionality
  - `programmatic` TR-11.3: Verify progress tracking
- **Notes**: Focus on intuitive file management

## [ ] Task 12: Homepage and Language Visualization
- **Priority**: P2
- **Depends On**: Task 11
- **Description**:
  - Create homepage layout
  - Implement language clustering visualization
  - Add language status indicators
  - Develop navigation between sections
- **Acceptance Criteria Addressed**: AC-7
- **Test Requirements**:
  - `human-judgment` TR-12.1: Evaluate homepage design
  - `programmatic` TR-12.2: Test language clustering visualization
  - `programmatic` TR-12.3: Verify navigation functionality
- **Notes**: Use React Flow or D3.js for clustering visualization

## [ ] Task 13: Progress Tracking and Mistake Collection
- **Priority**: P1
- **Depends On**: Task 8
- **Description**:
  - Implement progress state management
  - Create mistake collection system
  - Develop review functionality
  - Add progress visualization
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `programmatic` TR-13.1: Verify progress tracking
  - `programmatic` TR-13.2: Test mistake collection
  - `human-judgment` TR-13.3: Evaluate progress visualization
- **Notes**: Critical for adaptive learning experience

## [ ] Task 14: Stage 3 Comprehensive Exercises
- **Priority**: P2
- **Depends On**: Task 13
- **Description**:
  - Implement random question selection
  - Develop listening exercises
  - Create speaking exercises
  - Add writing exercises
  - Implement round management (R1 → R2)
- **Acceptance Criteria Addressed**: AC-4, AC-5, AC-6
- **Test Requirements**:
  - `programmatic` TR-14.1: Test random question selection
  - `programmatic` TR-14.2: Verify round management
  - `human-judgment` TR-14.3: Evaluate exercise variety
- **Notes**: Focus on balanced question types

## [ ] Task 15: UI Refinement and Animation
- **Priority**: P2
- **Depends On**: Task 14
- **Description**:
  - Apply Anthropic's design style
  - Add micro-interactions and animations
  - Implement responsive design
  - Optimize user experience
- **Acceptance Criteria Addressed**: AC-7
- **Test Requirements**:
  - `human-judgment` TR-15.1: Evaluate visual design
  - `human-judgment` TR-15.2: Test animations and interactions
  - `programmatic` TR-15.3: Verify responsive behavior
- **Notes**: Focus on clean, minimalist design with subtle animations