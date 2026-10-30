# Contributing to Inclu: A Classroom for Everyone

Inclu is a classroom workspace with a teacher board, a class server, and a student app. Keep each change focused on a related behavior.

## Setup

Use Node.js 22 LTS. From the repository root:

```sh
npm install
```

Copy `.env.example` to `.env` only when a feature needs optional services. Keep credentials and classroom data out of commits.

Start the board and server with `npm run dev`; the default address is `http://localhost:3000`.

For student app work, install Flutter and run `flutter pub get` from `student/`.

## Checks

Run the relevant checks before sharing a change:

```sh
npm run check
npx vitest run
npm run build
```

For Flutter changes, run `flutter analyze` and `flutter test` from `student/`.

## Change guidelines

- Add a regression check for confirmed bug fixes.
- Keep English and Indonesian interface translations aligned.
- Preserve class join links and saved data unless the change includes a migration.
- Use commit messages that describe the change that was actually made.
