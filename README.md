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

## Auto-deploy on every push

Vercel deploys from Git by default. To get a **new production deploy every time you push to `main`**:

1. **Project → Settings → Git** — confirm this repo is connected (`Grantlannin/prodbot`).
2. **Production Branch** — set to **`main`** (or whatever branch you push to).
3. **Ignored Build Step** — leave **empty** or make sure the command does **not** always exit `0` with “skip” (a bad ignore script will block deploys).
4. Push to `main` — Vercel should show a new deployment within ~1 minute. Check **Deployments** in the project.

**Preview deploys:** pushes to other branches (and PRs) usually get a **Preview** URL automatically; only the production branch updates your live site.

If deploys stopped after you changed settings, open **Deployments → … → Redeploy** once, then push again to confirm.
