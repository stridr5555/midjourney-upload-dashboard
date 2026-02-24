import http from 'http';
import fs from 'fs-extra';
import path from 'path';
import { refreshApiframePayload, getApiKey } from './lib/apiframe.js';

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

async function handleRefresh(req, res) {
  if (!getApiKey()) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Missing Apiframe API key' }));
    return;
  }
  try {
    const payload = await refreshApiframePayload();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

const server = http.createServer((req, res) => {
  const { url, method } = req;
  if (url === '/api/refresh' && method === 'POST') {
    handleRefresh(req, res);
    return;
  }
  let filePath = path.join(distDir, url.split('?')[0]);
  if (url === '/' || url === '/index.html') {
    filePath = path.join(distDir, 'index.html');
  }
  const ext = path.extname(filePath);
  const contentTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json'
  };
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
