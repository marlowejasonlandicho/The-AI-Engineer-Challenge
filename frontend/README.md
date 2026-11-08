# Steady

A light blue and orange chat for the supportive mental coach living in `api/index.py`. You type here. Next.js forwards the message to FastAPI. FastAPI asks the model. The reply lands back in the thread.

Nothing you type is saved. Refresh the page and the conversation is gone.

## Run it locally

You want two terminals, both starting from the **repository root** (the folder that contains `api/` and `frontend/`).

**Terminal 1 — the coach**

```bash
uv sync
export OPENAI_API_KEY=sk-your-key-here
uv run uvicorn api.index:app --reload
```

That serves FastAPI at `http://127.0.0.1:8000`. The key stays in that shell. The browser never sees it.

**Terminal 2 — the UI**

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Say hello, or tap one of the starter prompts.

`npm run dev` proxies `/api/chat` to `http://127.0.0.1:8000`. If your API is on another origin, copy `env.example` to `.env.local` and set `BACKEND_URL`.

## What the screen does

- Enter sends. Shift+Enter adds a line. The box grows with what you type.
- The Python endpoint only accepts one message, so the page folds earlier turns into that message. The coach can follow the thread, and the API stays as it is.
- If the backend is asleep, the page says so instead of failing quietly.

## Ship it

From the repository root:

```bash
npm install -g vercel
vercel
```

The root `vercel.json` builds this Next.js app and the Python API together. `/api/*` goes to FastAPI. Everything else is Steady.

Set `OPENAI_API_KEY` in the Vercel project settings before you expect real replies.

If you deploy **only** this `frontend/` folder as its own Vercel project, set `BACKEND_URL` to the public origin of the API (no trailing slash) and redeploy.
