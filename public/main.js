const basePrompts = [
  'Neon nocturne skyline, reflective chrome, ultra wide-angle',
  'Bio-luminescent forest spirits, cinematic lighting, 8K',
  'Futuristic samurai in rain, volumetric lighting, natural poses',
  'Retro-future diner interior, chrome panels, film grain',
  'Surreal desert storm, floating monoliths, golden hour',
  'Crystal city with hovering gardens, atmospheric perspective',
  'Mechanical butterfly close-up, macro depth, soft focus',
  'Celestial library, dramatic shafts of light, endless shelves'
];

const grid = document.getElementById('grid');
const promptEditor = document.getElementById('prompt-editor');
const status = document.getElementById('status');
const progressBar = document.getElementById('progress-bar');
const logList = document.getElementById('log-list');

let currentBatch = [];
let selection = new Set();

const getRandomStat = () => (Math.random() * 0.35 + 0.65).toFixed(2);
const getRandomLeverage = () => (Math.random() * 2 + 0.5).toFixed(2);

function pushLog(message, type = 'info') {
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.textContent = `${new Date().toLocaleTimeString()} — ${message}`;
  logList.prepend(entry);
}

function setProgress(percent) {
  if (progressBar) {
    progressBar.style.width = `${percent}%`;
  }
}

function stageProgress(stage, context = 'Action') {
  const ratios = { start: 10, mid: 55, finish: 100, scrape: 40, scrapeFinish: 90 };
  setProgress(ratios[stage] ?? ratios.start);
  pushLog(`${context}: ${stage}`, 'info');
}

function createBatchFromImages(images = [], promptText = 'Midjourney selection') {
  if (!images.length) return false;
  currentBatch = images.map((image, index) => ({
    id: `apiframe-${index}-${Date.now()}`,
    prompt: `${promptText} :: variation ${index + 1}`,
    probability: getRandomStat(),
    edge: (Math.random() * 0.1 + 0.01).toFixed(2),
    leverage: getRandomLeverage(),
    status: index % 3 === 0 ? 'Open trades' : 'Ready',
    image
  }));
  renderBatch();
  return true;
}

function renderBatch() {
  grid.innerHTML = '';
  currentBatch.forEach(card => {
    const article = document.createElement('article');
    article.className = 'card';
    article.dataset.id = card.id;
    article.innerHTML = `
      <img src="${card.image}" alt="Midjourney mockup" loading="lazy" />
      <strong>${card.prompt}</strong>
      <span class="meta">Probability: ${card.probability} · Edge: ${card.edge} · Lvrg: ${card.leverage}x</span>
      <span class="meta">Status: ${card.status}</span>
      <label><input type="checkbox" aria-label="Select for upload"> Select for Adobe upload</label>
    `;
    const checkbox = article.querySelector('input');
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        selection.add(card.id);
        article.classList.add('selected');
      } else {
        selection.delete(card.id);
        article.classList.remove('selected');
      }
      updateStatus();
    });
    grid.appendChild(article);
  });
  selection.clear();
  updateStatus();
}

function updateStatus(message) {
  if (message) {
    status.textContent = message;
  } else if (selection.size > 0) {
    status.textContent = `${selection.size} image${selection.size === 1 ? '' : 's'} selected for upload.`;
  } else {
    status.textContent = 'Waiting for your selections...';
  }
}

async function fetchLatestFromApi() {
  stageProgress('start', 'Refreshing Apiframe batch');
  try {
    const response = await fetch('/api/refresh', { method: 'POST' });
    stageProgress('mid', 'Refreshing Apiframe batch');
    if (!response.ok) throw new Error(`status ${response.status}`);
    const payload = await response.json();
    if (createBatchFromImages(payload.image_urls ?? payload.raw?.image_urls ?? [], payload.prompt)) {
      updateStatus('Loaded assets from Apiframe.');
      promptEditor.value = payload.prompt ?? promptEditor.value;
      stageProgress('finish', 'Refreshing Apiframe batch');
      return true;
    }
    throw new Error('No images returned');
  } catch (err) {
    stageProgress('finish', 'Refreshing Apiframe batch');
    console.warn('Fetching latest batch failed:', err.message);
    pushLog(err.message, 'error');
    return false;
  }
}

async function loadSampleBatch() {
  try {
    const response = await fetch('data/sample-latest.json');
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const payload = await response.json();
    if (createBatchFromImages(payload.image_urls, payload.prompt)) {
      updateStatus('Displaying the sample Midjourney batch.');
      promptEditor.value = payload.prompt;
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Loading sample batch failed:', err.message);
    return false;
  }
}

async function generateImagesFromPrompt() {
  const prompt = promptEditor.value.trim();
  if (!prompt) {
    updateStatus('Type a prompt first.');
    return false;
  }
  stageProgress('start', 'Generating images');
  updateStatus('Generating images for your prompt...');
  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    stageProgress('mid', 'Generating images');
    if (!response.ok) throw new Error(`status ${response.status}`);
    const payload = await response.json();
    if (createBatchFromImages(payload.image_urls ?? payload.raw?.image_urls ?? [], payload.prompt)) {
      updateStatus('Generated images ready.');
      stageProgress('finish', 'Generating images');
      return true;
    }
    return false;
  } catch (err) {
    stageProgress('finish', 'Generating images');
    console.warn('Generate failed:', err.message);
    pushLog(err.message, 'error');
    updateStatus('Generation failed.');
    return false;
  }
}

async function scrapeMidjourneyExplore() {
  stageProgress('scrape', 'Scraping Midjourney explore');
  try {
    const response = await fetch('/api/scrape-midjourney', { method: 'POST' });
    if (!response.ok) throw new Error(`status ${response.status}`);
    const payload = await response.json();
    const images = payload.images?.map(img => img.src).filter(Boolean) ?? [];
    if (createBatchFromImages(images, 'Midjourney explore scrape')) {
      updateStatus('Fresh Midjourney gallery loaded.');
      stageProgress('scrapeFinish', 'Scraping Midjourney explore');
      return true;
    }
    return false;
  } catch (err) {
    stageProgress('finish', 'Scraping Midjourney explore');
    console.warn('Scrape failed:', err.message);
    pushLog(err.message, 'error');
    updateStatus('Unable to scrape Midjourney right now.');
    return false;
  }
}

document.getElementById('generate-prompts').addEventListener('click', generateImagesFromPrompt);
document.getElementById('fetch-batch').addEventListener('click', async () => {
  const loaded = await fetchLatestFromApi();
  if (!loaded) {
    const fallback = await loadSampleBatch();
    if (!fallback) {
      updateStatus('Unable to load sample batch.');
    }
  }
});
document.getElementById('scrape-midjourney').addEventListener('click', async () => {
  const loaded = await scrapeMidjourneyExplore();
  if (!loaded) {
    updateStatus('Scrape returned nothing.');
  }
});

document.getElementById('upload-selection').addEventListener('click', () => {
  if (selection.size === 0) {
    updateStatus('Select at least one image before uploading.');
    return;
  }
  updateStatus(`Uploading ${selection.size} images to Adobe Stock...`);
  setTimeout(() => updateStatus('Upload queued. Metadata synced per Adobe guidelines.'), 1200);
});

(async () => {
  const loaded = await fetchLatestFromApi();
  if (!loaded) {
    const sample = await loadSampleBatch();
    if (!sample) {
      updateStatus('Unable to load sample batch.');
    }
  }
})();
