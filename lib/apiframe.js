import fs from 'fs-extra';
import path from 'path';
import fetch from 'node-fetch';

const config = {
  imagine: 'https://api.apiframe.pro/imagine',
  fetch: 'https://api.apiframe.pro/fetch'
};

const prompts = [
  'Cinematic neon city streets, rain reflections, volumetric light',
  'Hyper-detailed fantasy forest with floating bonsai gardens',
  'Futuristic astronaut playing koi in a cyberpunk pond',
  'Sculptural portrait of a musician carved from chrome and gold',
  'Floating temples above a misty ocean, pastel dawn',
  'Radial light trails over desert dunes, wide-angle drama',
  'Aerial view of a crystalline city built on ice',
  'Retro sci-fi control room with holographic diagrams'
];

function parseApiTxt(filePath) {
  try {
    const lines = fs.readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);
    for (let i = 0; i < lines.length; i += 2) {
      const label = (lines[i] || '').toLowerCase();
      const value = lines[i + 1] || '';
      if (!value) continue;
      if (label.includes('apiframe')) {
        return value;
      }
    }
  } catch (err) {
    // ignore
  }
  return null;
}

export function getApiKey() {
  return (
    process.env.APIFRAME_API_KEY || process.env.APIFRAME_KEY || parseApiTxt(path.resolve('../api.txt'))
  );
}

async function postImagine(prompt, apiKey) {
  const response = await fetch(config.imagine, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey
    },
    body: JSON.stringify({ prompt, aspect_ratio: '3:2' })
  });
  if (response.status !== 200) {
    throw new Error(`Imagine failed: ${response.status}`);
  }
  const json = await response.json();
  if (!json.task_id) throw new Error('No task_id in response');
  return json.task_id;
}

async function postFetch(taskId, apiKey) {
  const response = await fetch(config.fetch, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey
    },
    body: JSON.stringify({ task_id: taskId })
  });
  if (response.status !== 200) {
    throw new Error(`Fetch failed: ${response.status}`);
  }
  return response.json();
}

async function poll(taskId, apiKey) {
  let attempt = 0;
  let lastResult = null;
  while (attempt < 8) {
    const result = await postFetch(taskId, apiKey);
    lastResult = result;
    if (result.image_urls?.length || result.original_image_url) {
      return result;
    }
    if (result.status && result.status !== 'processing') {
      return result;
    }
    attempt += 1;
    await new Promise(r => setTimeout(r, 2000));
  }
  return lastResult;
}

export async function refreshApiframePayload(options = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Missing APIFRAME_API_KEY');
  }
  const prompt = options.prompt ?? prompts[Math.floor(Math.random() * prompts.length)];
  const taskId = await postImagine(prompt, apiKey);
  const result = await poll(taskId, apiKey);
  const payload = {
    prompt,
    task_id: taskId,
    generatedAt: new Date().toISOString(),
    image_urls: result.image_urls ?? (result.original_image_url ? [result.original_image_url] : []),
    raw: result
  };
  if (options.writeFiles !== false) {
    const publicDataDir = path.resolve('public', 'data');
    const distDataDir = path.resolve('dist', 'data');
    await fs.ensureDir(publicDataDir);
    await fs.writeJson(path.resolve(publicDataDir, 'latest.json'), payload, { spaces: 2 });
    await fs.ensureDir(distDataDir);
    await fs.writeJson(path.resolve(distDataDir, 'latest.json'), payload, { spaces: 2 });
  }
  return payload;
}

export { prompts };
