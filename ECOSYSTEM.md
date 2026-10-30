# Inclu architecture

Inclu connects a teacher's board and students' phones through a classroom server. The board can run in a browser or as a desktop app; the student client is a Flutter app.

## Main parts

- **Teacher board:** React and TypeScript interface for the canvas, voice input, lesson tools, and class controls.
- **Class server:** Express and Socket.IO services for room creation, class participation, board updates, and AI requests.
- **Student app:** Flutter client for joining a room, reading lesson notes, sending a typed question, and using classroom activities.
- **AI adapters:** Ollama for a local Gemma model, plus optional Gemini and Vertex AI adapters when configured.
- **Desktop wrapper:** Electron packages the teacher board for desktop use.

## Typical class flow

1. The teacher opens a room and shares its QR code or room code.
2. Students join from the Flutter app while connected to the same local network.
3. Board updates and class activity pass through the classroom server.
4. Optional AI requests run through the configured local or cloud provider.

## Configuration

Set optional service credentials in `.env`. Vertex AI requires `GOOGLE_CLOUD_PROJECT`; no project ID is embedded in the source. Keep credentials and real classroom data out of version control.

## Source map

- `components/`, `hooks/`, `store.ts` — board interface and client state
- `server/`, `server.ts` — classroom server and AI adapters
- `student/` — Flutter student app
- `electron/` — desktop wrapper
- `api/` — serverless endpoints
- `tests/` — automated checks