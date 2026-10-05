# Daywinner bot (Chrome extension)

Blocks distracting sites during Produc focus sessions using the blocklist in Produc.

## Install (Chrome Web Store — when published)

Install from the Chrome Web Store listing (one click). No unpacked load required.

## Install (unpacked — dev / before store approval)

1. Open Chrome → **Extensions** → enable **Developer mode**
2. Click **Load unpacked**
3. Select this `extension/` folder
4. Optional: enable **Allow in incognito**
5. Open [Daywinner](https://daywinner.bot/app) → **Focus extension** → start a session with soft or hard lock

Or download the zip from the app: `/daywinner.zip`

If blocking stops working after a domain change, open `chrome://extensions` and click **Reload** on Daywinner bot.

## Publish to Chrome Web Store

See **[STORE_SUBMISSION.md](./STORE_SUBMISSION.md)** for the full checklist, permission justifications, reviewer notes, and timeline (~2–4 weeks).

Build the upload zip:

```bash
node scripts/package-extension-store.mjs
```

Privacy policy (required): https://daywinner.bot/privacy/focus-extension

## How it works

- Daywinner syncs blocklist + session state when Soft/Hard lock turns on or off (not every second).
- Chrome block rules redirect matching sites to `blocked.html` on new loads; a light page script covers stubborn sites (e.g. X) on new tabs.
- Blocking is off during breaks, no-lock sessions, and when no session is active.
- Enable **Allow in Incognito** if you use a private window — blocking is per Chrome profile.
- Block hits log infractions in Daywinner (`Blocked site: …`).
- **Time study check-ins**: during an active focus session, a type-in card appears on your current tab.
- All extension data stays in `chrome.storage.local` — nothing sent to external servers.

## Configure blocking

In Produc, click **Focus extension** (above “What you got done today”):

- Social media pack + per-site toggles
- Custom blocked domains
