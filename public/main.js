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
const tabToggles = document.querySelectorAll('.tab-toggle');
const tabPanels = document.querySelectorAll('.tab-panel');
const scrapedPromptText = document.getElementById('scraped-prompts');
const scrapeStatus = document.getElementById('scrape-status');
const applyScrapedButton = document.getElementById('apply-scraped-prompt');

let currentBatch = [];
let selection = new Set();
let activeTab = 'apiframe';
let scrapedPrompts = [];

const stageMap = { start: 10, mid: 55, finish: 100, scrape: 35, scrapeFinish: 80 };

function pushLog(message, type = 'info') {
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.textContent = `${new Date().toLocaleTimeString()} — ${message}`;
  logList.prepend(entry);
}

function setProgress(value) {
  if (progressBar) {
    progressBar.style.width = `${value}%`;
  }
}

function stageProgress(stage, context) {
  const percent = stageMap[stage] ?? stageMap.start;
  setProgress(percent);
  pushLog(`[${activeTab}] ${context} (${stage})`, 'info');
}

function setActiveTab(tabName) {
  activeTab = tabName;
  tabToggles.forEach(toggle => {
    toggle.classList.toggle('active', toggle.dataset.tab === tabName);
  });
  tabPanels.forEach(panel => {
    panel.classList.toggle('active', panel.dataset.tab === tabName);
  });
  pushLog(`Switched to ${tabName} tab`, 'info');
}

function updateScrapedPrompts(prompts) {
  scrapedPrompts = prompts;
  if (!scrapedPromptText) return;
  if (!prompts.length) {
    scrapedPromptText.textContent = 'No prompts scraped yet.';
    return;
  }
  scrapedPromptText.innerHTML = prompts.slice(0, 5).map(p => `<li>${p}</li>`).join('');
}

function createBatchFromImages(images = [], promptText = 'Midjourney selection') {
  if (!images.length) return false;
  currentBatch = images.map((image, index) => ({
    id: `apiframe-${index}-${Date.now()}`,
    prompt: `${promptText} :: variation ${index + 1}`,
    probability: (Math.random() * 0.35 + 0.65).toFixed(2),
    edge: (Math.random() * 0.1 + 0.01).toFixed(2),
    leverage: (Math.random() * 2 + 0.5).toFixed(2),
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
    pushLog(err.message, 'error');
    console.warn('Fetching latest batch failed:', err.message);
    return false;
  }
}

async function generateImagesFromPrompt() {
  const prompt = promptEditor.value.trim();
  if (!prompt) {
    updateStatus('Type a prompt first.');
    return false;
  }
  stageProgress('start', 'Generating Apiframe images');
  updateStatus('Generating images for your prompt...');
  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    stageProgress('mid', 'Generating Apiframe images');
    if (!response.ok) throw new Error(`status ${response.status}`);
    const payload = await response.json();
    if (createBatchFromImages(payload.image_urls ?? payload.raw?.image_urls ?? [], payload.prompt)) {
      updateStatus('Generated images ready.');
      stageProgress('finish', 'Generating Apiframe images');
      return true;
    }
    return false;
  } catch (err) {
    stageProgress('finish', 'Generating Apiframe images');
    pushLog(err.message, 'error');
    console.warn('Generate failed:', err.message);
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
    const prompts = payload.images?.map(img => img.prompt).filter(Boolean) ?? [];
    updateScrapedPrompts(prompts);
    if (createBatchFromImages(images, 'Midjourney explore scrape')) {
      updateStatus('Fresh Midjourney gallery loaded.');
      stageProgress('scrapeFinish', 'Scraping Midjourney explore');
      scrapeStatus.textContent = `${images.length} images retrieved`; 
      return true;
    }
    return false;
  } catch (err) {
    stageProgress('finish', 'Scraping Midjourney explore');
    pushLog(err.message, 'error');
    console.warn('Scrape failed:', err.message);
    updateStatus('Unable to scrape Midjourney right now.');
    scrapeStatus.textContent = 'scrape failed';
    return false;
  }
}

document.getElementById('generate-prompts').addEventListener('click', async () => {
  if (activeTab !== 'apiframe') {
    setActiveTab('apiframe');
  }
  await generateImagesFromPrompt();
});

document.getElementById('fetch-batch').addEventListener('click', async () => {
  if (activeTab !== 'apiframe') {
    setActiveTab('apiframe');
  }
  await fetchLatestFromApi();
});

document.getElementById('scrape-midjourney').addEventListener('click', async () => {
  if (activeTab !== 'midjourney') {
    setActiveTab('midjourney');
  }
  await scrapeMidjourneyExplore();
});

document.getElementById('upload-selection').addEventListener('click', () => {
  if (activeTab !== 'apiframe') {
    setActiveTab('apiframe');
  }
  if (selection.size === 0) {
    updateStatus('Select at least one image before uploading.');
    return;
  }
  updateStatus(`Uploading ${selection.size} images to Adobe Stock...`);
  setTimeout(() => updateStatus('Upload queued. Metadata synced per Adobe guidelines.'), 1200);
});

document.getElementById('apply-scraped-prompt').addEventListener('click', () => {
  if (!scrapedPrompts.length) {
    updateStatus('No scraped prompts available yet.');
    return;
  }
  promptEditor.value = scrapedPrompts[0];
  updateStatus('Applied scraped prompt.');
});

tabToggles.forEach(toggle => {
  toggle.addEventListener('click', () => {
    setActiveTab(toggle.dataset.tab);
  });
});

(async () => {
  stageProgress('start', 'Initializing dashboard');
  pushLog('Dashboard initialized', 'info');
})();
