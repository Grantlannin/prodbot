# Daywinner bot (Chrome extension)

Blocks distracting sites during Produc focus sessions using the blocklist in Produc.

## Install (Chrome Web Store — when published)

Install from the Chrome Web Store listing (one click). No unpacked load required.

## Install (unpacked — dev / before store approval)

1. Open Chrome → **Extensions** → enable **Developer mode**
2. Click **Load unpacked**
3. Select this `extension/` folder
4. Optional: enable **Allow in incognito**
5. Open [Produc](https://produc-xi.vercel.app) → **Focus extension** → start a focus session

Or download the zip from Produc: `/produc-focus-extension.zip`

## Publish to Chrome Web Store

See **[STORE_SUBMISSION.md](./STORE_SUBMISSION.md)** for the full checklist, permission justifications, reviewer notes, and timeline (~2–4 weeks).

Build the upload zip:

```bash
node scripts/package-extension-store.mjs
```

Privacy policy (required): https://produc-xi.vercel.app/privacy/focus-extension

## How it works

- Produc syncs blocklist + session state to the extension via a content script on produc-xi.vercel.app
- While `status === working`, matching domains redirect to `blocked.html`
- Blocking is off during breaks and when no session is active
- Block hits log infractions in Produc (`Blocked site: …`)
- All extension data stays in `chrome.storage.local` — nothing sent to external servers

## Configure blocking

In Produc, click **Focus extension** (above “What you got done today”):

- Social media pack + per-site toggles
- Custom blocked domains
