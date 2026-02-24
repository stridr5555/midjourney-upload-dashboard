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
const assetImages = [
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&q=60',
  'https://images.unsplash.com/photo-1482192597420-4817fdd3ea7e?auto=format&fit=crop&w=600&q=60',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=60',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=60',
  'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=600&q=60',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=60',
  'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=600&q=60',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=60'
];

const grid = document.getElementById('grid');
const promptEditor = document.getElementById('prompt-editor');
const status = document.getElementById('status');
let currentBatch = [];
let selection = new Set();

const getRandomStat = () => (Math.random() * 0.35 + 0.65).toFixed(2);
const getRandomLeverage = () => (Math.random() * 2 + 0.5).toFixed(2);

function generateBatch() {
  currentBatch = Array.from({ length: 16 }, (_, i) => {
    const prompt = basePrompts[Math.floor(Math.random() * basePrompts.length)];
    return {
      id: `prompt-${Date.now()}-${i}`,
      prompt: `${prompt} :: Variation ${i + 1}`,
      probability: getRandomStat(),
      edge: (Math.random() * 0.1 + 0.01).toFixed(2),
      leverage: getRandomLeverage(),
      status: i % 3 === 0 ? 'Open trades' : 'Ready',
      image: assetImages[i % assetImages.length]
    };
  });
  renderBatch();
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

function simulateGemini() {
  const prompt = basePrompts[Math.floor(Math.random() * basePrompts.length)];
  promptEditor.value = `${prompt} :: ${new Date().toLocaleString()} Gemini remix`;
  updateStatus('Prompt refreshed with Gemini insights.');
}

document.getElementById('generate-prompts').addEventListener('click', simulateGemini);
document.getElementById('fetch-batch').addEventListener('click', () => {
  generateBatch();
  updateStatus('Fetched the latest Midjourney batch.');
});
document.getElementById('upload-selection').addEventListener('click', () => {
  if (selection.size === 0) {
    updateStatus('Select at least one image before uploading.');
    return;
  }
  updateStatus(`Uploading ${selection.size} images to Adobe Stock...`);
  setTimeout(() => updateStatus('Upload queued. Metadata synced per Adobe guidelines.'), 1200);
});

generateBatch();
