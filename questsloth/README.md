# QuestSloth

**Turn lecture notes into a dungeon-crawler quiz — entirely in the browser.**

Built for [Hacktoberfest Open-Source AI Challenge: Week 3 — Slow and Steady](https://dev.to/challenges/hacktoberfest-week3-2026-10-19). Teachers paste notes; local **Gemma 2 2B** (via [WebLLM](https://webllm.mlc.ai/)) forges a `quest.json`. Students fight the boss by answering — no inference on the play path.

## Why open weights?

- Notes never leave the device (Forge runs on-device WebGPU).
- No OpenAI/Claude bill for every quiz.
- Students only need the JSON file — the dreaded “write five MCQs by hand” chore becomes a paste → download.

## Stack

- Vite + React + TypeScript + Tailwind CSS
- `@mlc-ai/web-llm` · prefers `gemma-2-2b-it-q4f16_1-MLC-1k` (~1.5GB); auto-falls back to `gemma-2-2b-it-q4f32_1-MLC` (~2.5GB) when WebGPU `shader-f16` is missing
- Static host: GitHub Pages (`base: '/QuestSloth/'`, HashRouter)

## Modes

| Mode | Route | AI? |
| --- | --- | --- |
| **Teacher Forge** | `#/forge` | Yes — loads Gemma, emits strict quest JSON |
| **Student Dungeon** | `#/dungeon` | No — upload JSON, forged handoff, sample, or stash |

Quest schema: `questTitle`, `bossName`, five questions with `options[4]`, `correctAnswerIndex`, `explanation`.

## Game mechanics

- **Difficulty:** Easy / Normal / Hard (HP and damage tables).
- **Powers (pick one):** Hint, Shield, Focus Strike (Shield & Focus unlock at level 2).
- **Combos & score:** 100 pts + 25 per streak step; flawless clear +500.
- **Level bonuses:** mild bonus damage / player HP from delver level.
- **Achievements:** first win, flawless, combos, hard clear, escape, scholar — stored in `localStorage`.
- **SFX + music:** procedural Web Audio (`src/lib/audio.ts`) — soft lobby pad, battle loop that speeds up on enrage, hit/crit/block/power/forge/achievement cues. Header mute toggle; no audio files.
- **Motion:** CSS battle FX (screen punch, slash, shield bubble, combo particles); respects `prefers-reduced-motion`.
- Forge **Play in Dungeon** stores the pack in `sessionStorage` and a short local stash.

## Local setup

```bash
npm install
npm run dev
```

Open the URL Vite prints. Forge needs **WebGPU** (recent Chrome or Edge). First model download is ~1.5GB and caches in the browser.

```bash
npm run build
npm run preview
```

## Deploy

Push to `main`. GitHub Actions (`.github/workflows/deploy.yml`) builds and deploys `dist/` to GitHub Pages. Enable **Settings → Pages → Source: GitHub Actions**.

Live: https://arjankc.github.io/QuestSloth/

## License

MIT — see [LICENSE](./LICENSE).
