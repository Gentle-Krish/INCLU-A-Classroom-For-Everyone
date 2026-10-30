<p align="center">
  <img src="public/icon.png" width="96" height="96" alt="Inclu Logo" style="border-radius: 20%;" />
</p>

<h1 align="center">Inclu: A Classroom for Everyone</h1>

<p align="center">
  <strong>Intelligent Classroom Whiteboard & Real-Time Collaborative Learning Space</strong>
</p>

<p align="center">
  <a href="#overview">Overview</a> •
  <a href="#what-makes-inclu-unique">Why Inclu is Unique</a> •
  <a href="#powered-by-gemma-4">Gemma 4 AI Engine</a> •
  <a href="#visual-tour">Visual Tour</a> •
  <a href="#key-features">Key Features</a> •
  <a href="#installation--getting-started">Installation</a> •
  <a href="#project-structure">Project Structure</a> •
  <a href="#offline-first-architecture">Offline Architecture</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-v22%20LTS-339933?style=flat&logo=node.js&logoColor=white" alt="Node.js version" />
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?style=flat&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/TailwindCSS-v4-06B6D4?style=flat&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Flutter-Student%20App-02569B?style=flat&logo=flutter&logoColor=white" alt="Flutter" />
  <img src="https://img.shields.io/badge/Gemma-4%20E2B%20%7C%2031B-8E75FF?style=flat&logo=google&logoColor=white" alt="Gemma 4" />
  <img src="https://img.shields.io/badge/License-MIT-green.svg?style=flat" alt="MIT License" />
</p>

---

## Overview

**Inclu: A Classroom for Everyone** is a modern, privacy-first whiteboard designed specifically for teachers and students. It unites a high-performance infinite digital chalkboard, an integrated classroom voice/text AI assistant, an embedded suite of interactive teaching widgets, and a zero-latency local classroom network that connects student mobile devices without needing internet connectivity.

Teachers run Inclu on a laptop or interactive classroom display, while students join directly from their phones via local Wi-Fi or LAN to follow along, ask questions silently, and participate in live quests.

---

## 🌟 What Makes Inclu Unique?

Unlike conventional digital whiteboards (Miro, FigJam, Canva, or Google Jamboard) designed for corporate remote meetings, **Inclu is purpose-built from the ground up for physical and blended classrooms**:

| Dimension | Conventional Whiteboards | Inclu |
| :--- | :--- | :--- |
| **Network Reliance** | Requires 100% active cloud internet; crashes if school Wi-Fi WAN drops | **100% Offline-First**: Runs entirely over local school LAN or offline laptop with local UDP beacons |
| **AI Role** | Generic conversational sidebar chatbot disconnected from canvas | **Spatial Canvas Actor**: Understands whiteboard geometry, places widgets in non-colliding quadrants, and edits elements in-place |
| **Student Privacy** | Requires student email accounts, Google logins, or third-party trackers | **Zero Student Logins**: Ephemeral 4-digit LAN room codes; no accounts, no data leaves the classroom |
| **STEM Interactivity** | Static drawing or plain image pasting | **Live Code Execution**: AI generates interactive, runnable HTML5/JS physics & chemistry simulations on the fly |
| **Classroom Sync** | Heavy WebRTC/WebSocket cloud relays requiring per-seat billing | **Local UDP Beacon (`port 39124`)**: Automatic peer discovery on classroom Wi-Fi with zero configuration |
| **Hardware Synergy** | Desktop-only or mobile-web compromise | **Native Multi-Surface**: Electron/Web teacher smartboard paired with high-performance native Flutter student companion |

---

## 🧠 Powered by Gemma 4: Deep Local & Cloud Intelligence

Inclu harnesses **Google's Gemma 4 family** (`gemma4:e2b` locally via Ollama, and `gemma-4-31b-it` via Google AI Studio) through a custom-calibrated model configuration (`scripts/Modelfile.chalk-gemma`). 

Rather than treating the LLM as a generic text generator, Inclu fine-tunes Gemma 4's inference parameters and system directives into a **specialized classroom pedagogical assistant**:

```
                  ┌─────────────────────────────────────────┐
                  │          Gemma 4 Intelligence           │
                  │   (gemma4:e2b Local / gemma-4-31b-it)   │
                  └────────────────────┬────────────────────┘
                                       │
     ┌──────────────────┬──────────────┴─────┬──────────────────┐
     ▼                  ▼                    ▼                  ▼
┌──────────────┐ ┌──────────────┐     ┌──────────────┐ ┌──────────────────┐
│ Spatial      │ │ Continuous   │     │ Interactive  │ │ Real-Time Silent │
│ Quadrant     │ │ In-Place     │     │ STEM Apps    │ │ Student Q&A      │
│ Placement    │ │ Mutation     │     │ Engine       │ │ (Grounded in     │
│ (Anti-Clash) │ │ (By Object)  │     │ (HTML5/JS)   │ │ Lesson Notes)    │
└──────────────┘ └──────────────┘     └──────────────┘ └──────────────────┘
```

### 1. Spatial Multi-Task Orchestration (Collision-Free Canvas Placement)
Gemma 4 is trained to understand whiteboard geometry. When generating teaching materials, it distributes components across designated quadrants to avoid colliding with active teacher notes:
- **`TOP_LEFT`**: Attendance trackers & roster lists
- **`TOP_RIGHT`**: Classroom timers & stopwatches
- **`CENTER`**: High-priority Mermaid flowcharts & mindmaps
- **`BOTTOM_CENTER`**: Formal lesson documents with embedded **KaTeX** mathematical formulas
- **`CENTER_RIGHT`**: Interactive multiple-choice quizzes and student polls

### 2. Continuous In-Place Mutation ("Edit Don't Recreate")
When a teacher asks: *"Add photosystem II to the photosynthesis diagram,"* typical LLMs erase and regenerate the entire chart. Gemma 4 targets the exact canvas `objectId` (e.g., `web_mm_photo`), calling `update_component` with `action: "REPLACE"`, preserving existing visual branches and smoothly appending requested details.

### 3. Interactive STEM Simulations (`add_interactive_app`)
Gemma 4 directly generates executable, self-contained HTML5 and JavaScript interactive widgets right on the board:
- Dynamic gravity/pendulum physics simulations with adjustable sliders
- Chemical reaction balancers and pH scale demonstrators
- Real-time mathematical function graphers and geometry manipulators

### 4. Real-Time Silent Student Q&A (Grounded in Lesson Notes)
Students frequently hesitate to interrupt class when confused. From the Flutter student phone app, they can type a silent question. Gemma 4 combines the student's question with the teacher's active `lessonNotes` (`server/classAnswer.ts`), instantly returning a concise, 2–3 sentence personalized explanation directly to the student's phone—computed 100% locally on the teacher's laptop.

### 5. Deterministic Zero-Hallucination Calibration
- **Inference Temperature**: `0.05` for consistent, reliable structured function calls
- **Context Window**: `32,768` tokens (`num_ctx 32768`) to maintain full semester lesson history
- **Thinking Mode**: `OLLAMA_THINKING_MODE = 'nothink'` for immediate, low-latency chalkboard response

---

## Visual Tour

### 1. Minimalist Interactive Whiteboard
A clean, warm chalk-styled workspace with zero clutter. Includes pen with pressure curves, smooth eraser, geometric shape recognition, rich typography, images, and multi-page notebooks.

<p align="center">
  <img src="docs/screenshots/landing-board.png" alt="Chalk Main Whiteboard Interface" width="95%" />
</p>

---

### 2. Integrated Classroom AI Assistant
Instant voice and text assistance directly beside your notes. Ask for step-by-step problem explanations, quiz formulations, diagram ideas, or pin AI responses directly onto the whiteboard canvas as visual notes. Supports 100% offline local inference (Gemma via Ollama) and cloud inference (Gemini 3.8 Flash).

<p align="center">
  <img src="docs/screenshots/assistant-drawer.png" alt="Chalk Classroom AI Assistant Drawer" width="95%" />
</p>

---

### 3. Live Quests & Student Engagement
Launch gamified live quests and interactive quizzes straight from your lesson board. Students respond directly from their phones, giving you real-time response tallies, scoreboards, and silent questions from shy students.

<p align="center">
  <img src="docs/screenshots/quest-dialog.png" alt="Chalk Live Quest & Classroom Interaction" width="95%" />
</p>

---

### 4. Interactive Classroom Tools & Widget Palette
Access a comprehensive toolset built into the left toolbar: scientific calculator, countdown timers, sticky notes, unit converter, dynamic periodic table, student attendance manager, random spin wheel, scoreboards, and mathematical function graphers.

<p align="center">
  <img src="docs/screenshots/classroom-tools.png" alt="Classroom Tools and Widget Palette" width="95%" />
</p>

---

### 5. Multi-Provider AI & Offline-First Privacy
Seamlessly toggle between **Local Ollama** (100% offline, zero data leaves the classroom laptop), **Google AI Studio** (`GEMINI_API_KEY`), and **Google Cloud Vertex AI**. Auto-detection falls back gracefully based on classroom network availability.

<p align="center">
  <img src="docs/screenshots/settings-dialog.png" alt="Chalk AI and System Settings" width="95%" />
</p>

---

### 6. Session Persistence & High-Res Export
One-click saving to laptop IndexedDB with undo/redo history. Export your lesson boards to vector SVG, 1x/2x/4K Ultra-HD PNG, or multi-page A4 PDF handouts for your students.

<p align="center">
  <img src="docs/screenshots/save-export-menu.png" alt="Save and Export Dialog" width="95%" />
</p>

---

## Key Features

- **Infinite Canvas & Smooth Strokes**: Low-latency freehand vector drawing powered by `perfect-freehand` with variable pressure curves and eraser paths.
- **Offline-First & Privacy Guaranteed**: Run completely offline without internet using Ollama (`chalk-gemma:2b` / `gemma4:e2b`).
- **Student Mobile Companion**: Cross-platform Flutter mobile client allowing students to view lesson notes in real time, answer questions, and submit silent inquiries.
- **LAN Discovery & UDP Beacon**: Built-in broadcast beacon (`CLASS_BEACON_PORT: 39124`) automatically advertises active classes on the school subnet so students can join with a simple 4-digit room code.
- **Interactive Teaching Widgets**: Calculator, Stopwatch/Timer, Spin Wheel, Attendance, Periodic Table, To-Do, and Math Graph.
- **Multi-Format Export**: PNG (1x, 2x, 4K), SVG, and printable multi-page A4 PDF documents.
- **Desktop Electron Bundle**: Ready to package as a standalone Windows, macOS, or Linux desktop application.

---

## Installation & Getting Started

### Prerequisites

- **Node.js**: `v22.x LTS` or higher
- **npm**: `v10.x` or higher
- *(Optional for offline AI)*: [Ollama](https://ollama.ai) installed with `gemma4:e2b`
- *(Optional for mobile app)*: [Flutter SDK](https://flutter.dev) (only needed if building the student app)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/Gentle-Krish/INCLU-A-Classroom-For-Everyone.git
cd INCLU-A-Classroom-For-Everyone
npm install
```

### 2. Configure Environment Variables

Inclu works out-of-the-box in local offline mode without any configuration. To enable cloud Gemini or Vertex AI, create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` to specify your preferred settings:

```ini
# Server Configuration
SERVER_PORT=3000
NODE_ENV=development

# Optional Cloud AI (Google AI Studio)
GEMINI_API_KEY=your_gemini_api_key_here

# Optional Vertex AI Configuration
# GOOGLE_CLOUD_PROJECT=your-gcp-project-id
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json

# Local Ollama URL (default: http://localhost:11434)
# OLLAMA_BASE_URL=http://localhost:11434
```

### 3. Setup Local Gemma 4 Model (Optional for Offline AI)

To initialize the customized classroom Gemma 4 model locally via Ollama:

```bash
# Pull base Gemma 4 E2B model
ollama pull gemma4:e2b

# Create the optimized model using the repository Modelfile
ollama create chalk-gemma:2b -f scripts/Modelfile.chalk-gemma
```

### 4. Run the Development Server

```bash
npm run dev
```

Visit **`http://localhost:3000`** in your browser. Inclu will start with the teacher whiteboard active.

---

## Running the Student Companion App

The student companion application is located under the `student/` directory and built with Flutter:

```bash
cd student
flutter pub get
flutter run
```

Students connect by entering the 4-digit classroom code displayed on the teacher's board.

---

## Project Structure

```text
INCLU/
├── api/                   # Vercel serverless AI endpoints (fallback & cloud)
│   └── ai/                # generate, status, transcribe, pull-model handlers
├── components/            # React UI components for the whiteboard & tools
│   ├── AiChatDrawer.tsx   # Classroom AI assistant sidebar
│   ├── AiStatusBadge.tsx  # Dynamic AI health and connectivity pill
│   ├── CanvasManager.tsx  # Core whiteboard canvas renderer & stroke engine
│   ├── ClassroomTools.tsx # Interactive widgets (Calculator, Timer, Periodic Table)
│   ├── ExportDialog.tsx   # PDF, PNG, and SVG high-res export interface
│   ├── Header.tsx         # Top application header with room info & quick actions
│   ├── QuestDialog.tsx    # Live gamified student quiz modal
│   └── SettingsView.tsx   # AI provider, theme, audio, and language configuration
├── docs/                  # Comprehensive documentation & asset guides
│   ├── screenshots/       # High-resolution application screenshots
│   ├── API_DOCUMENTATION.md
│   ├── TEACHER_GUIDE.md
│   └── USAGE.md
├── electron/              # Electron main process & desktop runtime wrappers
├── hooks/                 # Custom React hooks (AI status polling, canvas sync, audio)
├── public/                # Static assets, web manifests, PWA icons
├── scripts/               # Custom Modelfiles (Modelfile.chalk-gemma) & build scripts
├── server/                # Express & Socket.io backend services
│   ├── aiRouter.ts        # Modular REST API endpoints for AI orchestration
│   ├── geminiAdapter.ts   # Google AI Studio Gemini SDK adapter
│   ├── ollamaAdapter.ts   # Local Ollama adapter with streaming & cancel tokens
│   ├── vertexAdapter.ts   # Google Cloud Vertex AI enterprise adapter
│   └── classAnswer.ts     # Automated Q&A synthesis for student asks
├── student/               # Flutter mobile application for students
├── tests/                 # Unit & integration test suites (Vitest + Testing Library)
├── constants.ts           # Centralized system constants, default models, and timeouts
├── server.ts              # Primary classroom HTTP, WebSocket, and UDP beacon server
├── store.ts               # Zustand global state (canvas pages, chat, active tools)
└── types.ts               # Complete TypeScript interface & schema definitions
```

---

## Offline-First Architecture

```mermaid
graph TD
    subgraph Classroom Local Network
        TeacherBrowser["Teacher Board (Browser / Electron)<br/><code>http://localhost:3000</code>"]
        Server["Inclu Node Server & Socket.IO<br/>(Local Machine)"]
        UDP["UDP Discovery Beacon<br/>(Port 39124)"]
        StudentApp["Student Mobile App<br/>(Flutter iOS / Android)"]
        Ollama["Local Ollama Service<br/><code>gemma4:e2b</code> / 100% Offline"]
    end

    subgraph Optional Cloud
        GeminiCloud["Google AI Studio<br/>(Gemini 3.8 Flash / Gemma 4 31B)"]
        VertexCloud["Google Cloud Vertex AI"]
    end

    TeacherBrowser <-->|WebSocket & REST| Server
    Server -->|Broadcasts LAN Beacon| UDP
    StudentApp -.->|Auto-Detects Beacon| UDP
    StudentApp <-->|Real-time Socket.IO| Server
    Server <-->|Offline Local AI| Ollama
    Server -.->|Optional Online AI| GeminiCloud
    Server -.->|Optional Online AI| VertexCloud
```

---

## Scripts & Verification

All standard workflow scripts can be run via `npm`:

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts server with live auto-reloading (`tsx watch server.ts`) |
| `npm start` | Runs production server with tsx runtime |
| `npm run check` | Runs fast zero-thrash TypeScript type check (`tsc --noEmit`) |
| `npm test` | Runs automated unit and integration tests with Vitest |
| `npm run build` | Compiles frontend client assets via Vite |
| `npm run build:all` | Compiles frontend client and backend TypeScript bundles |
| `npm run electron:dev` | Launches the Inclu desktop app in local Electron runtime |
| `npm run build:electron:win` | Packages standalone Windows `.exe` installer (NSIS) |

---

## Contributing

Contributions, bug reports, and suggestions are warmly welcomed! Please read our [Contributing Guide](CONTRIBUTING.md) and check [open issues](https://github.com/Gentle-Krish/INCLU-A-Classroom-For-Everyone/issues).

---

## License

Inclu: A Classroom for Everyone is open-source software licensed under the **[MIT License](LICENSE)**.