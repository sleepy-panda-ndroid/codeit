
  ## Running the code

  Run `npm i` to install the dependencies.

  Set backend URL (optional, defaults to `http://localhost:4000`):

  `VITE_API_BASE=http://localhost:4000`

  ## AI setup

  AI requests are proxied through the backend (so your key is never exposed in the browser).

  Set these variables in `codeit/backend/.env`:

  - `AI_API_KEY=your_ai_provider_key`
  - `AI_BASE_URL=https://api.openai.com/v1` (optional, default shown)
  - `AI_MODEL=gpt-4o-mini` (optional)
  - `AI_SYSTEM_PROMPT=You are a helpful coding assistant.` (optional)

  Run `npm run dev` to start the development server.
  