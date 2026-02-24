# Midjourney Upload Dashboard (Local Edition)

This repo now packages a self-contained dashboard that showcases how the Midjourney → Adobe Stock workflow should behave. The current site is a static HTML/CSS/JS experience that:

- renders a 16-card batch of Midjourney-style outputs with prompts, probabilities, edges, and leverage indicators
- rails each card with a selection checkbox and incremental status indicators
- wires the button bar to regenerate prompts, pull a refreshed `data/latest.json` payload, and simulate uploading the chosen assets to Adobe Stock
- loads real results from [Apiframe's Imagine/Fetch API](https://docs.apiframe.ai/api-endpoints/imagine) whenever `public/data/latest.json` is populated
- falls back to the committed `public/data/sample-latest.json` or randomized placeholders when no API payload is available

## Local development

1. `npm install` (already done, but rerun if you change dependencies).
2. `npm run apiframe:refresh` to summon the Apiframe Imagine API (requires `APIFRAME_API_KEY` in your environment or present in `../api.txt` labeled `Apiframe`).
3. `npm run build` to copy the `public/` assets (including `data/`) into `dist/` so the dashboard can be served.
4. `python -m http.server 4173 --directory dist` (or the `serve` command of your choice) and visit [http://127.0.0.1:4173](http://127.0.0.1:4173).

`npm run apiframe:refresh` will:

- post a curated prompt to `https://api.apiframe.pro/imagine`
- poll the `fetch` endpoint until images are ready (or stop after a few seconds)
- emit `public/data/latest.json`, which is automatically loaded by the dashboard

If the API key is missing, the script warns and exits, leaving the sample payload untouched.

## Folder layout

- `public/` – the static files that get copied to `dist/` (HTML, JS, CSS, and fallback data). `main.js` orchestrates the UI on the client and talks to `data/latest.json`.
- `scripts/build.js` – copies `public/` → `dist/` during `npm run build`.
- `scripts/apiframe-fetch.js` – optional helper script to populate `public/data/latest.json` from the Apiframe Imagine/Fetch APIs. Run it before building to seed the dashboard with real assets.
- `dist/` – build output served to browsers (ignored via `.gitignore`).

## Next moves

- Expand `scripts/apiframe-fetch.js` into a headless worker (Playwright/Discord automation) if you want on-demand Midjourney generations instead of manual refreshes.
- Hook the `Upload Selected to Adobe Stock` button into the Puppeteer automation once the credentials and metadata schema are hashed out.
- Connect the repo to a deployment target (Vercel or another host) once the rate limit clears and `dist/` contains the latest build.
