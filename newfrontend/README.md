
# codeIT Frontend (`newfrontend`)

This is the Vite + React frontend for codeIT.

## Prerequisites

- Node.js 18+ (recommended)
- npm
- Running backend API (default: `http://localhost:4000`)

## Install

From this folder:

```bash
npm install
```

## Environment

Frontend API base URL (optional):

```bash
VITE_API_BASE=http://localhost:4000
```

If not set, it defaults to `http://localhost:4000`.

You can place this in a `.env` file inside `newfrontend/`.

## Run (Development)

```bash
npm run dev
```

Vite will print the local URL in terminal (usually `http://localhost:5173`).

## Build

```bash
npm run build
```

## Backend dependency

This frontend depends on backend routes such as:

- Auth (`/auth/*`)
- Projects / files / execution (`/projects/*`)
- AI chat (`/ai/chat`)

If backend is not running (or `VITE_API_BASE` is incorrect), login, project loading, code execution, and AI features will fail.

## AI Setup (Backend - Groq)

AI calls are proxied through backend so provider keys are never exposed in browser.

Set these in `codeit/backend/.env`:

- `AI_API_KEY=your_groq_api_key` (required)
- `AI_BASE_URL=https://api.groq.com/openai/v1` (optional, default shown)
- `AI_MODEL=llama-3.1-8b-instant` (optional, default shown)
- `AI_SYSTEM_PROMPT=You are a helpful coding assistant.` (optional)

Also ensure backend has:

- `MONGO_URI=...`
- `JWT_SECRET=...`
- `PORT=4000` (optional, defaults to `4000`)
  