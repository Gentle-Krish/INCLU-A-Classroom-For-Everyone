# Deployment and packaging

## Environment

Start with `.env.example` and add only the optional service settings needed by your deployment. Keep credentials in a local `.env` file or the deployment platform's secret store.

The local server uses port `3000` by default. Set `SERVER_PORT` to choose another port.

## Local production build

```sh
npm ci
npm run check
npm run build:all
npm start
```

The health endpoint is available at `/api/health` while the server is running.

## Desktop packaging

Electron packaging is configured in `package.json`. On Windows, run:

```sh
npm run build:electron:win
```

This produces local build artifacts under `dist-release/`. Review the output on the target machine before distributing it. No installer download is configured in this repository's setup guide.

## Student app

Build the Flutter app from `student/` using the Flutter tooling for the target platform. Configure the server address and test room joining on the same local network before a classroom deployment.

## Hosting

The project includes API routes and deployment configuration. Select a hosting environment that supports the required Node endpoints, configure secrets outside the repository, and verify the health endpoint and classroom flow in that environment before sharing it.