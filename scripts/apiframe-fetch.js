import fs from 'fs-extra';
import path from 'path';
import fetch from 'node-fetch';

const config = {
  imagine: 'https://api.apiframe.pro/imagine',
  fetch: 'https://api.apiframe.pro/fetch'
};

function parseApiTxt() {
  try {
    const lines = fs.readFileSync(path.resolve('../api.txt'), 'utf8').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    for (let i = 0; i < lines.length; i += 2) {
      const label = lines[i] || '';
      const value = lines[i + 1] || '';
      if (!value) continue;
      const normalized = label.toLowerCase();
      if (normalized.includes('apiframe') || normalized.includes('apiframe key')) {
        return value;
      }
    }
  } catch (err) {
    return null;
  }
  return null;
}

function getApiKey() {
  return process.env.APIFRAME_API_KEY || process.env.APIFRAME_KEY || parseApiTxt();
}

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

async function postImagine(prompt) {
  const response = await fetch(config.imagine, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey
    },
    body: JSON.stringify({
      prompt,
      aspect_ratio: '3:2'
    })
  });

  if (response.status !== 200) {
    throw new Error(`Imagine failed: ${response.status}`);
  }

  const json = await response.json();
  if (!json.task_id) {
    throw new Error('No task_id returned');
  }
  return json.task_id;
}

async function postFetch(taskId) {
  const response = await fetch(config.fetch, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey
    },
    body: JSON.stringify({
      task_id: taskId
    })
  });

  if (response.status !== 200) {
    throw new Error(`Fetch failed: ${response.status}`);
  }

  const json = await response.json();
  return json;
}

const apiKey = getApiKey();
if (!apiKey) {
  console.warn('APIFRAME_API_KEY not set; skipping fetch.');
  process.exit(0);
}

async function poll(taskId) {
  let attempt = 0;
  let lastResult = null;
  while (attempt < 8) {
    const result = await postFetch(taskId);
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

(async () => {
  try {
    const prompt = prompts[Math.floor(Math.random() * prompts.length)];
    console.log('Submitting prompt to Apiframe:', prompt);
    const taskId = await postImagine(prompt);
    console.log('Task submitted:', taskId);
    const result = await poll(taskId);
    if (!result) {
      console.warn('No result retrieved.');
      return;
    }

    const payload = {
      prompt,
      task_id: taskId,
      generatedAt: new Date().toISOString(),
      image_urls: result.image_urls ?? (result.original_image_url ? [result.original_image_url] : []),
      raw: result
    };

    const dataDir = path.resolve('public', 'data');
    await fs.ensureDir(dataDir);
    await fs.writeJson(path.resolve(dataDir, 'latest.json'), payload, { spaces: 2 });
    console.log('Wrote latest Apiframe payload to public/data/latest.json');
  } catch (err) {
    console.error('Apiframe fetch failed:', err.message);
    process.exit(1);
  }
})();
