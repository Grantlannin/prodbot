# prodbot

Personal productivity app: Next.js chat (AI Performance Orchestrator), dashboard, work timer, and Supabase-ready wiring.

## Run locally

```bash
npm install
cp .env.example .env.local
# Add ANTHROPIC_API_KEY and Supabase keys to .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy on Vercel

Use the **Next.js** preset (auto-detected from this repo). In **Project → Settings → Build & Development**:

- **Framework Preset:** Next.js  
- **Output Directory:** leave **empty** (default). Do **not** set it to `public` or `dist` — that causes “No Output Directory named public” after a successful `next build`.

Then add your environment variables under **Settings → Environment Variables** and redeploy.
