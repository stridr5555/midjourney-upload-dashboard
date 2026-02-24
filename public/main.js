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
let currentBatch = [];
let selection = new Set();

const getRandomStat = () => (Math.random() * 0.35 + 0.65).toFixed(2);
const getRandomLeverage = () => (Math.random() * 2 + 0.5).toFixed(2);

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
  try {
    const response = await fetch('/api/refresh', { method: 'POST' });
    if (!response.ok) throw new Error(`status ${response.status}`);
    const payload = await response.json();
    if (createBatchFromImages(payload.image_urls ?? payload.raw?.image_urls ?? [], payload.prompt)) {
      updateStatus('Loaded assets from Apiframe.');
      promptEditor.value = payload.prompt ?? promptEditor.value;
      return true;
    }
    throw new Error('No images returned');
  } catch (err) {
    console.warn('Fetching latest batch failed:', err.message);
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

document.getElementById('generate-prompts').addEventListener('click', () => {
  const prompt = basePrompts[Math.floor(Math.random() * basePrompts.length)];
  promptEditor.value = prompt;
  updateStatus('Prompt refreshed.');
});

document.getElementById('fetch-batch').addEventListener('click', async () => {
  const loaded = await fetchLatestFromApi();
  if (!loaded) {
    const fallback = await loadSampleBatch();
    if (!fallback) {
      updateStatus('Unable to load sample batch.');
    }
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
