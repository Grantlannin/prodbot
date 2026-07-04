# Chrome Web Store submission — Daywinner bot

Use this when publishing to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).

## Timeline (realistic)

| Phase | Time |
|-------|------|
| Your prep (icon, screenshots, privacy URL, zip) | A few hours – 1 weekend |
| Submit | ~1 day |
| Google review (broad host permissions) | **1–3 weeks** typical |
| Possible clarification + resubmit | +3–7 days |
| **Total to live** | **~2–4 weeks** (mostly Google’s queue) |

Site blockers with `*://*/*` are reviewed longer than simple extensions. Plan one round of questions.

**Good news:** Produc’s paywall is **off** today, so reviewers can test at [produc-xi.vercel.app](https://produc-xi.vercel.app) with **no login**. If you re-enable billing later, add test credentials to submission notes.

---

## Checklist before submit

- [ ] Pay **$5** one-time [Chrome Web Store developer fee](https://chrome.google.com/webstore/devconsole) (dedicated Google account recommended)
- [ ] **Icons** in `extension/icons/` (16, 48, 128 PNG) — included in repo
- [ ] **Store zip:** `node scripts/package-extension-store.mjs` → upload `public/produc-focus-extension-store.zip`
- [ ] **Privacy policy URL:** https://produc-xi.vercel.app/privacy/focus-extension
- [ ] **Screenshots:** 1–5 at 1280×800 or 640×400 (blocked page + Produc “Focus extension” modal + active session)
- [ ] **Category:** Productivity · **Language:** English
- [ ] Paste **permission justifications** and **store description** below into the listing form

---

## Store listing copy

**Name:** Daywinner bot

**Summary (132 chars max):**  
block distracting sites during daywinner bot usage

**Description:**

Daywinner bot is the official companion extension for [Daywinner](https://produc-xi.vercel.app).

While you run a focus session in Produc, the extension blocks sites you choose—social media bundle and custom domains. Blocking turns off during breaks and when your session ends.

**Features**
- Block Twitter/X, Reddit, YouTube, Instagram, and more—or add your own domains
- Syncs with your Produc dashboard blocklist
- Logs block attempts as infractions in Produc
- No data sent to external servers; settings stay on your device

**How to use**
1. Install this extension
2. Open Produc → click **Focus extension** (above “What you got done today”)
3. Download/load is only needed for unpacked dev; from the store, install is one click
4. Start a focus session with a countdown
5. Visit a blocked site to verify the blocked page appears

Requires the Produc web app. The extension does not work standalone.

---

## Permission justifications (submission form)

Copy each block into the matching field.

**declarativeNetRequest**  
Blocks user-configured websites during active Produc focus sessions by redirecting main-frame navigation to the extension’s blocked page.

**declarativeNetRequestFeedback**  
Detects when blocking rules fire so the extension can record a local block event for the user’s Produc session stats.

**storage**  
Stores blocklist, session state (active/inactive, end time), and pending block events locally via chrome.storage.local. No cloud sync from the extension.

**alarms**  
Ends blocking automatically when the user’s focus session countdown expires, even if the Produc tab is closed.

**Host permission: \*://\*/\***  
Users can add any domain to their blocklist. Rules apply only to domains they enable in Produc during an active focus session, not a fixed list hardcoded by us. Broad host access is required so arbitrary user-entered domains can be blocked.

---

## Reviewer test notes (paste into “Notes for reviewer”)

```
TESTING PRODUC FOCUS

1. Install the extension.
2. Open https://produc-xi.vercel.app (no login required; paywall is disabled).
3. Click "Focus extension" (top right, above "What you got done today").
4. Confirm "Social media pack" is enabled. Optionally add a custom domain.
5. Click Start → pick a task → set duration (e.g. 25m) → choose lock mode → Start session.
6. In a new tab, visit https://twitter.com or https://reddit.com.
   Expected: redirect to extension blocked page with time remaining.
7. End session in Produc or wait for countdown; blocking should stop.

Data: All extension data stays in chrome.storage.local. No external servers.
Content script runs only on produc-xi.vercel.app to sync session/blocklist from the web app.

If paywall is enabled in a future version, contact [YOUR EMAIL] for test credentials.
```

Replace `[YOUR EMAIL]` before submit.

---

## After approval

- Point users to the store listing instead of unpacked zip
- Keep `public/produc-focus-extension.zip` for dev/fallback if you want
- **Declare all permissions you’ll need up front** on updates—new permissions disable the extension for existing users until they accept

---

## Build store zip

```bash
node scripts/package-extension-store.mjs
```

Upload output: `public/produc-focus-extension-store.zip`
