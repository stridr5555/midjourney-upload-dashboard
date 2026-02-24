import http from 'http';
import fs from 'fs-extra';
import path from 'path';
import { refreshApiframePayload, getApiKey } from './lib/apiframe.js';
import { scrapeMidjourneyTop } from './lib/midjourney-scraper.js';

const distDir = path.resolve('dist');
const port = process.env.PORT || 4173;

function sendFile(filePath, res, contentType = 'text/html') {
  fs.readFile(filePath)
    .then(data => {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    })
    .catch(() => {
      res.writeHead(404);
      res.end('Not found');
    });
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk.toString();
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(err);
      }
    });
  });
}

function sendJson(res, payload, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

async function persistPayload(payload) {
  const dirs = [path.resolve('public', 'data'), path.resolve('dist', 'data')];
  await Promise.all(dirs.map(async dir => {
    await fs.ensureDir(dir);
    await fs.writeJson(path.join(dir, 'latest.json'), payload, { spaces: 2 });
  }));
}

async function handleRefresh(req, res) {
  if (!getApiKey()) {
    return sendJson(res, { error: 'Missing Apiframe API key' }, 400);
  }
  try {
    let payload = await refreshApiframePayload();
    if (!payload.image_urls?.length) {
      const cards = await scrapeMidjourneyTop();
      if (cards.length) {
        payload = {
          task_id: payload.task_id ?? 'scrape-fallback',
          prompt: cards[0].prompt || 'Midjourney explore fallback',
          generatedAt: new Date().toISOString(),
          image_urls: cards.map(card => card.src),
          raw: { source: 'scrape', cards }
        };
        await persistPayload(payload);
      }
    }
    return sendJson(res, payload);
  } catch (err) {
    return sendJson(res, { error: err.message }, 500);
  }
}

async function handleGenerate(req, res) {
  if (!getApiKey()) {
    return sendJson(res, { error: 'Missing Apiframe API key' }, 400);
  }
  try {
    const body = await readJsonBody(req);
    const prompt = (body.prompt || '').trim();
    if (!prompt) {
      return sendJson(res, { error: 'Provide a prompt' }, 422);
    }
    const payload = await refreshApiframePayload({ prompt });
    return sendJson(res, payload);
  } catch (err) {
    return sendJson(res, { error: err.message }, 500);
  }
}

async function handleScrape(req, res) {
  try {
    const cards = await scrapeMidjourneyTop();
    if (!cards.length) {
      return sendJson(res, { error: 'No cards scraped' }, 502);
    }
    return sendJson(res, { images: cards });
  } catch (err) {
    return sendJson(res, { error: err.message }, 500);
  }
}

const contentTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json'
};

const server = http.createServer((req, res) => {
  const { url, method } = req;
  if (url === '/api/refresh' && method === 'POST') {
    handleRefresh(req, res);
    return;
  }
  if (url === '/api/generate' && method === 'POST') {
    handleGenerate(req, res);
    return;
  }
  if (url === '/api/scrape-midjourney' && method === 'POST') {
    handleScrape(req, res);
    return;
  }

  let filePath = path.join(distDir, url.split('?')[0]);
  if (url === '/' || url === '/index.html') {
    filePath = path.join(distDir, 'index.html');
  }
  const ext = path.extname(filePath);
  const contentType = contentTypes[ext] || 'application/octet-stream';
  fs.pathExists(filePath)
    .then(exists => {
      if (!exists) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      sendFile(filePath, res, contentType);
    })
    .catch(() => {
      res.writeHead(500);
      res.end('Server error');
    });
});

server.listen(port, () => {
  console.log(`Server ready on http://127.0.0.1:${port}`);
});
