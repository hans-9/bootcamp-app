# bootcamp-app

A QA test-management tool: manage test cases, suites, test runs, bug reports, dashboards, and reports. React + Vite client, Express API, SQLite storage, in an npm-workspaces monorepo.

## Stack

- **client/** — React + Vite SPA (dev port 3000)
- **server/** — Express API + `better-sqlite3` (dev port 3001)

In dev, Vite serves the client and proxies `/api` to the server. In production, the Express server serves both the API and the built client as a single service.

## Local development

```bash
npm install
npm run dev          # starts server and client together
```

Open http://localhost:3000.

Other commands:

```bash
npm run dev -w server   # server only
npm run dev -w client   # client only
npm run build           # build the client into client/dist
npm start               # run the production server (serves API + built client)
```

## Configuration

Copy `.env.example` to `.env` for local overrides. The only runtime variable is `PORT` (defaults to 3001); hosts inject it automatically, so nothing needs to be set for deployment.

## Deploy

Hosted on [Render](https://render.com) using its free web-service tier. One service builds the client and runs the Express server, which serves both the API and the built client — no second service and no CORS.

Configuration lives in [`render.yaml`](./render.yaml) (free plan, Node 22, build `npm install --include=dev && npm run build`, start `npm start`, health check `/api/health`).

**One-click deploy:** open this URL (it reads `render.yaml`, prompts you to sign in, then provisions the service):

```
https://render.com/deploy?repo=https://github.com/hans-9/bootcamp-app
```

Or click: [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/hans-9/bootcamp-app)

After it deploys, the public URL is `https://<service-name>.onrender.com`.

### Notes on the free tier

- The service **spins down after 15 minutes of inactivity**; the next request triggers a cold start (~1 minute).
- The filesystem is **ephemeral** — the SQLite database (`server/data.db`) is recreated empty on each deploy or restart. This suits a demo. For persistent data, move to Render's managed Postgres or attach a paid persistent disk.
- Free-tier bandwidth is limited (5 GB/month as of 2026).
