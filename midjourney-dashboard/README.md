# Midjourney Upload Dashboard (Local Edition)

This repo now packages a self-contained dashboard that showcases how the Midjourney → Adobe Stock workflow should behave. The current site is a static HTML/CSS/JS experience that:

- renders a 16-card batch of Midjourney-style outputs with prompts, probabilities, edges, and leverage indicators
- rails each card with a selection checkbox and incremental status indicators
- wires the button bar to call Apiframe endpoints (`/api/generate`, `/api/refresh`) and a headless Midjourney scraper (`/api/scrape-midjourney`), so pressing the buttons loads real imagery instead of static placeholders
- uses the built-in Node server (`server.js`) to serve the dashboard, refresh the Apiframe payload, and run the Playwright scraper on demand

## Local development

1. `npm install` (already done, but rerun if you change dependencies).
2. Place your Apiframe API key in the environment (`APIFRAME_API_KEY` or `APIFRAME_KEY`) or add it to `../api.txt` with a label containing `Apiframe`.
3. `npm run build` to copy the `public/` assets (including `data/`) into `dist/` so the dashboard can be served.
4. `node server.js` and visit [http://127.0.0.1:4173](http://127.0.0.1:4173).

### Button behaviors

- **Generate Images**: Sends the prompt from the editor to `POST /api/generate`, which uses the Apiframe Imagine API and immediately renders the resulting images once the job completes.
- **Refresh Apiframe Batch**: Calls `POST /api/refresh` to get a fresh random prompt from Apiframe, mirroring the previous `npm run apiframe:refresh` helper but now from the UI.
- **Scrape Midjourney Explore**: Calls `POST /api/scrape-midjourney`, which spins up Playwright, opens `https://www.midjourney.com/explore?tab=top`, and extracts the first 16 card images and their labels.

The `Upload Selected to Adobe Stock` button is still wired to the simulated upload flow; we can later plug in the Puppeteer automation once the headless job is stable.

## Automation helpers

- `scripts/apiframe-fetch.js`: still useful if you want to seed `public/data/latest.json` during CI or a build pipeline. It now delegates to `lib/apiframe.js` and can write the payload to both `public/` and `dist/`.
- `server.js`: serves the built assets and exposes `/api/refresh`, `/api/generate`, and `/api/scrape-midjourney`. It's the entry point for the live dashboard.
- `lib/apiframe.js`: shared logic for posting imagine jobs, polling fetch, and writing the payload.
- `lib/midjourney-scraper.js`: uses Playwright to crawl Midjourney's Explore page and extract image/prompt pairs.

## Next moves

- Add a webhook receiver or real-time push so the `Upload Selected` button logs metadata and routes to the Adobe automation.
- Deploy `server.js` + `dist/` to a Node-friendly host so the button clicks can hit the Apiframe/Midjourney endpoints outside the local environment.
- Extend the scraper to capture prompt text, probability, and other metadata from the Midjourney cards if a stable selector emerges.
