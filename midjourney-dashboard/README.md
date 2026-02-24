# Midjourney Upload Dashboard

## Goal
Create a browser-based dashboard (hosted at `https://app.apiframe.ai/dashboard/tools/midjourney` or a locally proxied variant) that lets you:
1. Generate prompts (via Gemini search + Midjourney explore scraping) and dispatch them to Midjourney.
2. Display the latest 16 images generated (or scraped) in a selectable grid.
3. Push any chosen images directly to Adobe Stock via a headless browser automation flow (web UI login + upload).

## Components
1. **Prompt Research & Generation**
   - Headless Playwright script that scrapes `https://www.midjourney.com/explore?tab=top` for the currently trending prompts, keywords, and thumbnail URLs.
   - Gemini CLI/skill query (e.g., "Best Adobe Stock metadata styling guidelines" + targeted prompts like "Midjourney image prompts February 2026") to surface textual prompt suggestions and metadata best practices.
   - Local prompt generator UI that layers those suggestions, lets you tweak keywords, and exports the final string for Midjourney.

2. **Image Batch Viewer**
   - Dashboard UI (React/Next or similar) showing a 4×4 gallery of the latest 16 images.
   - Each image includes the prompt/metadata and a toggle to mark it as "selected for Adobe Stock".
   - After you choose a set, the dashboard exposes metadata entry fields (title, description, tags) that obey the Adobe Stock best practices (e.g., focus on the top 10 keywords, avoid style-of / trademarked terms, keep titles ~70 characters, mix literal/conceptual tags, no real names or brand references).

3. **Adobe Stock Upload Automation**
   - Headless Playwright (or Puppeteer) session that logs in to Adobe Stock using the credentials stored in `/home/strid3r/.openclaw/api.txt` (login/pass). CRITICAL: keep secrets out of logs.
   - The script uploads each selected image, fills metadata (title, description, keywords), and verifies success via UI feedback.
   - Because SFTP is unavailable, the automation will strictly mimic the Adobe Stock uploader flow.

4. **Midjourney Automation Flow**
   - After you click “Generate Prompts” or “Fetch Latest Midjourney Best Images,” the backend kicks off scraping + Gemini queries and populates the gallery.
   - If desired, we can extend the Playwright harness to open Discord (or the Midjourney web UI) and submit prompts automatically, downloading the generated images for the grid.

## Implementation Plan
1. **Infrastructure**: Scaffold a Node.js project with:
   - `packages/dashboard` housing a React UI (Next.js or Vite + React) to embed inside the apiframe wrapper.
   - `packages/automation` holding Playwright scripts (Midjourney scraping, Adobe Stock uploader, optional Discord prompt runner).
   - Shared helpers for metadata (Adobe keywords, prompt templates, etc.).

2. **Gemini Integration**: Add scripts (or CLI wrappers) that run `gemini "best prompts for Midjourney"` and `gemini "Adobe Stock metadata best practices"` on demand.
   - Capture output in JSON/text to feed the prompt generator.
   - Handle rate limits gracefully (currently hit 429). Potential fallback: cache results or batch queries onto another account if quotas are exhausted.

3. **Headless Browsing**:
   - Build a Playwright module that scrapes `midjourney.com/explore?tab=top` for at least 16 cards, extracting prompt text and image URLs.
   - Save images to `workspace/midjourney-dashboard/cache/` so the React UI can serve them.
   - Another Playwright module logs into Adobe Stock and uploads the chosen assets with metadata.

4. **Dashboard UI**:
   - Use a grid-of-cards component for the 16 images; each card displays metadata and selection controls.
   - Provide controls/buttons: `Generate Prompts`, `Fetch Latest Midjourney Best Images`, `Upload to Adobe Stock`.
   - Show metadata editing fields guided by Gemini/Adobe recommendations (top 10 keywords, 20-35 tag limit, no trademarked names, etc.).

5. **Security**:
   - Store Adobe credentials securely (currently in `api.txt`; ensure scripts read them without logging values).
   - Since uploads happen via headless browser, keep the automation environment isolated.

6. **Next Steps**
   - Confirm Midjourney generation flow (Discord automation vs. manual prompt use). If necessary, extend Playwright to operate against the Discord Web UI.
   - Build the data pipeline that refreshes the 16-image cache every batch.
   - Document the metadata rules (the Gemini search result: emphasise the 10 most descriptive keywords, 20-35 tag window, no “style-of” or celebrity references, singular nouns, conceptual keywords, concise titles, etc.).

Once we agree on the exact workflows (how you want to push prompts and how Adobe Stock expects metadata), I can start scaffolding the scripts + dashboard. Let me know whether you want this project version-controlled in this repo and if there’s a preferred frontend stack (Next.js, SvelteKit, etc.).