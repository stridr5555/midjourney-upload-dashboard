import { chromium } from 'playwright';

const URL = 'https://www.midjourney.com/explore?tab=top';

export async function scrapeMidjourneyTop({ timeoutMs = 30000 } = {}) {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    await page.waitForTimeout(12000);
    const cards = await page.$$eval('img', imgs =>
      imgs
        .map(img => ({
          src: img.src,
          prompt: img.alt || img.getAttribute('aria-label') || ''
        }))
        .filter(item => item.src && (item.src.includes('midjourney.com') || item.src.includes('cdn.discordapp.com') || item.src.includes('images.unsplash.com') || item.src.includes('apiframe')))
        .slice(0, 16)
    );
    return cards;
  } finally {
    await browser.close();
  }
}
