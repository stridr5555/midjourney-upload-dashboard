# Midjourney Upload Dashboard (Local Edition)

The dashboard now splits the experience into two dedicated flows: **Apiframe** (official API-based generation) and **Midjourney Explore** (headless scraping). Each tab has its own controls, progress log, and badge so you always know whether the API or the scraper is running.

## Tabs & Controls

- **Apiframe tab**: Contains buttons to generate images from the prompt editor, refresh a random Apiframe batch, or apply the latest scraped prompt. The progress bar/log entries are tagged with `[apiframe]` so you can watch exactly when the request starts, polls, and completes.
- **Midjourney Explore tab**: Taps into Playwright to visit `https://www.midjourney.com/explore?tab=top`, scrape the top cards, and build a gallery of their image URLs and prompt text. The scraped prompts are surfaced both in the log and in the Apiframe tab so you can reuse them when generating new Apiframe images. This tab does not trigger the Apiframe API.

## Architecture

- `server.js` serves the build output (`dist/`) and exposes `/api/refresh`, `/api/generate`, and `/api/scrape-midjourney`.
- `lib/apiframe.js` handles the Imagine/Fetch workflow and writes the last response into `public/data/latest.json` (for diagnostics).
- `lib/midjourney-scraper.js` runs Playwright headlessly to collect Midjourney explore images/prompts.
- `public/main.js` manages the UI, including tab switching, progress logging, and the shared grid.

## Local development

1. `npm install`
2. Make sure `APIFRAME_API_KEY` is available (or add it to `../api.txt` labeled `Apiframe`).
3. `npm run build`
4. `node server.js`
5. Visit [http://127.0.0.1:4173](http://127.0.0.1:4173).

Use the Apiframe tab to hit the official API, and the Midjourney tab when you want to scrape inspiration directly from the gallery. The log panel always shows what is happening for each tab, so there’s no ambiguity about which system is currently running.
