# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development Commands
- `npm start` - Run React development server on http://localhost:3000 (uses CRACO for TailwindCSS)
- `npm run server` - Run Express backend server on port 3001
- `npm run build` - Build production React app (CI=false to ignore warnings)
- `npm test` - Run Jest tests with React Testing Library

### Testing
- Individual test files can be run with: `npm test -- --testPathPattern=filename`
- Tests use React Testing Library and Jest DOM matchers
- Test files are located alongside components (e.g., `useNotepad.test.js`, `FloatingNotepad.test.js`)

## Architecture Overview

### Full-Stack Structure
This is a React frontend with Express backend lyrical analysis toolkit:

**Frontend** (`src/`):
- Main app: `App.js` - Central state management and tab routing
- Component-based architecture with tabs for different features
- Custom hooks for state management (`hooks/`)
- Utility functions for text analysis (`utils/`)
- TailwindCSS for styling with CRACO configuration

**Backend** (`server/index.js`):
- Simple Express server with JWT authentication
- In-memory storage for songs and users
- CORS enabled for development
- Song CRUD operations with authentication middleware

### Key Features & Components

**Tab-Based Interface**:
- `SearchTab` - Search through lyrics with highlighting
- `DictionaryTab` - Word definitions via Dictionary API  
- `SynonymsTab` - Synonyms/antonyms via DataMuse API
- `RhymesTab` - Rhyming words via DataMuse API
- `AnalysisTab` - AI-powered lyrical analysis using Gemini API
- `UploadTab` - File upload and song management
- `StatsTab` - Comprehensive lyrics statistics

**Core Services**:
- `geminiService.js` - Google Gemini AI integration for coherence and performance analysis
- `authService.js` - JWT token management and authentication
- `textAnalysis.js` - Extensive text metrics (syllables, reading level, rhyme patterns)
- `phoneticUtils.js` - Phonetic analysis and rhyme detection

**State Management**:
- Custom hooks pattern: `useLocalStorage`, `useFileUpload`, `useSearch`, `useNotepad`
- Central state in App.js with prop drilling to components
- LocalStorage persistence for user preferences and songs

**Floating Notepad**:
- Draggable, resizable notepad component
- Edit existing songs or create new content
- Export capabilities (TXT format)
- Unsaved changes tracking

### Data Flow

1. **Song Management**: Upload → Parse → Store locally → Sync with server (if authenticated)
2. **Analysis Pipeline**: Select song → Choose analysis type → AI processing → Results display
3. **Search Flow**: Query → Filter songs → Highlight matches → Display results
4. **API Integration**: External APIs (Dictionary, DataMuse) + Internal Gemini service

### Key Utilities

**Text Analysis** (`utils/textAnalysis.js`):
- Syllable counting with phonetic rules
- Reading level calculation (Flesch-Kincaid)
- Vocabulary complexity scoring
- Meter and stress pattern detection
- Writing quality analysis (weak words, clichés, power words)

**Phonetic Analysis** (`utils/phoneticUtils.js`):
- Rhyme detection and categorization
- Phonetic mapping for accurate analysis
- Statistical rhyme analysis

### Dependencies & APIs

**Key Dependencies**:
- `@google/generative-ai` - Gemini AI integration
- `jspdf`, `html2canvas` - PDF export functionality
- `dompurify` - XSS protection for user content
- `lucide-react` - Icon library

**External APIs**:
- Dictionary API (dictionaryapi.dev) - Word definitions
- DataMuse API - Synonyms, antonyms, rhymes
- Google Gemini API - Lyrical coherence and performance analysis

### Environment Setup

Required environment variables:
- `REACT_APP_GEMINI_API_KEY` - For AI analysis features

### File Structure Conventions

- Components organized by feature in `components/` subdirectories
- Hooks in `hooks/` directory with corresponding test files
- Utils in `utils/` with specialized analysis functions
- Services in `services/` for external integrations
- Data files in `data/` (phonetic mappings, etc.)

### Development Notes

- Uses CRACO for TailwindCSS integration without ejecting
- Dark mode support throughout the application
- Responsive design with mobile-specific considerations
- Rate limiting implemented for AI API calls
- Caching system for AI analysis results
- Authentication is optional - app works with/without login