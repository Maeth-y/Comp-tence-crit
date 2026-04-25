const csvUrl = 'cartes_cours_en_ligne.csv';

const state = {
  cards: [],
  index: 0,
  flipped: false,
  detailsOpen: false
};

const ui = {
  flashcard: document.getElementById('flashcard'),
  cardCounter: document.getElementById('cardCounter'),
  toggleDetailsBtn: document.getElementById('toggleDetailsBtn'),
  detailsPanel: document.getElementById('detailsPanel'),
  prevBtn: document.getElementById('prevBtn'),
  nextBtn: document.getElementById('nextBtn'),
  shuffleBtn: document.getElementById('shuffleBtn'),
  flipBtn: document.getElementById('flipBtn'),
  questionText: document.getElementById('questionText'),
  shortAnswerText: document.getElementById('shortAnswerText'),
  essentialFrText: document.getElementById('essentialFrText'),
  essentialZhText: document.getElementById('essentialZhText'),
  detailFrText: document.getElementById('detailFrText'),
  detailZhText: document.getElementById('detailZhText'),
  formulationFrText: document.getElementById('formulationFrText'),
  formulationZhText: document.getElementById('formulationZhText'),
  keywordsText: document.getElementById('keywordsText'),
  trapText: document.getElementById('trapText'),
  loaderHelp: document.getElementById('loaderHelp'),
  csvFileInput: document.getElementById('csvFileInput')
};

function normalizeHeader(header) {
  return String(header || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function parseCsv(text, separator = ';') {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === separator && !inQuotes) {
      row.push(field);
      field = '';
      continue;
    }

    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i++;
      row.push(field);
      if (row.some((cell) => String(cell).trim() !== '')) rows.push(row);
      row = [];
      field = '';
      continue;
    }

    field += ch;
  }

  if (field.length || row.length) {
    row.push(field);
    if (row.some((cell) => String(cell).trim() !== '')) rows.push(row);
  }

  return rows;
}

function mapRowsToCards(rows) {
  if (!rows.length) return [];

  const header = rows[0].map(normalizeHeader);

  const getIndex = (names) => {
    for (const n of names) {
      const idx = header.indexOf(normalizeHeader(n));
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const idx = {
    question: getIndex(['Question (français)', 'Question']),
    shortAnswer: getIndex(['Réponse courte (français)', 'Réponse courte']),
    essentialFr: getIndex(['Essentiel à retenir (français)']),
    essentialZh: getIndex(['Essentiel à retenir (中文)']),
    detailFr: getIndex(['Explication détaillée (français)']),
    detailZh: getIndex(['中文详细解释']),
    formulationFr: getIndex(['Formulation proche du cours (français)']),
    formulationZh: getIndex(['原文对应解释（中文）']),
    keywords: getIndex(['Mots-clés', 'Mots-cles']),
    trap: getIndex(['Piège possible', 'Piege possible'])
  };

  const required = ['question', 'shortAnswer', 'essentialFr', 'essentialZh'];
  const missing = required.filter((key) => idx[key] === -1);
  if (missing.length) {
    throw new Error(`Colonnes manquantes dans le CSV : ${missing.join(', ')}`);
  }

  return rows.slice(1).map((r) => ({
    question: r[idx.question] || '',
    shortAnswer: r[idx.shortAnswer] || '',
    essentialFr: r[idx.essentialFr] || '',
    essentialZh: r[idx.essentialZh] || '',
    detailFr: r[idx.detailFr] || '',
    detailZh: r[idx.detailZh] || '',
    formulationFr: r[idx.formulationFr] || '',
    formulationZh: r[idx.formulationZh] || '',
    keywords: r[idx.keywords] || '',
    trap: r[idx.trap] || ''
  }));
}

function renderCurrentCard() {
  if (!state.cards.length) return;
  const card = state.cards[state.index];

  ui.questionText.textContent = card.question;
  ui.shortAnswerText.textContent = card.shortAnswer;
  ui.essentialFrText.textContent = card.essentialFr;
  ui.essentialZhText.textContent = card.essentialZh;
  ui.detailFrText.textContent = card.detailFr;
  ui.detailZhText.textContent = card.detailZh;
  ui.formulationFrText.textContent = card.formulationFr;
  ui.formulationZhText.textContent = card.formulationZh;
  ui.keywordsText.textContent = card.keywords;
  ui.trapText.textContent = card.trap;

  ui.cardCounter.textContent = `${state.index + 1}/${state.cards.length}`;

  state.flipped = false;
  ui.flashcard.classList.remove('is-flipped');
}

function flipCard() {
  state.flipped = !state.flipped;
  ui.flashcard.classList.toggle('is-flipped', state.flipped);
}

function toggleDetails() {
  state.detailsOpen = !state.detailsOpen;
  ui.detailsPanel.hidden = !state.detailsOpen;
  ui.toggleDetailsBtn.textContent = state.detailsOpen
    ? 'Masquer l’explication détaillée'
    : 'Voir l’explication détaillée';
}

function nextCard() {
  if (!state.cards.length) return;
  state.index = (state.index + 1) % state.cards.length;
  renderCurrentCard();
}

function prevCard() {
  if (!state.cards.length) return;
  state.index = (state.index - 1 + state.cards.length) % state.cards.length;
  renderCurrentCard();
}

function shuffleCards() {
  for (let i = state.cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [state.cards[i], state.cards[j]] = [state.cards[j], state.cards[i]];
  }
  state.index = 0;
  renderCurrentCard();
}

async function loadCsvFromUrl() {
  const resp = await fetch(csvUrl, { cache: 'no-cache' });
  if (!resp.ok) throw new Error(`Impossible de charger ${csvUrl}`);
  const text = await resp.text();
  return text;
}

function bindEvents() {
  ui.flashcard.addEventListener('click', flipCard);
  ui.flashcard.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      flipCard();
    }
  });

  ui.flipBtn.addEventListener('click', flipCard);
  ui.nextBtn.addEventListener('click', nextCard);
  ui.prevBtn.addEventListener('click', prevCard);
  ui.shuffleBtn.addEventListener('click', shuffleCards);
  ui.toggleDetailsBtn.addEventListener('click', toggleDetails);

  ui.csvFileInput.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    initializeCards(text);
    ui.loaderHelp.hidden = true;
  });
}

function initializeCards(csvText) {
  const rows = parseCsv(csvText, ';');
  const cards = mapRowsToCards(rows);

  if (!cards.length) throw new Error('Aucune carte valide trouvée dans le CSV.');

  state.cards = cards;
  state.index = 0;
  state.detailsOpen = false;
  ui.detailsPanel.hidden = true;
  ui.toggleDetailsBtn.textContent = 'Voir l’explication détaillée';
  renderCurrentCard();
}

async function init() {
  bindEvents();

  try {
    const text = await loadCsvFromUrl();
    initializeCards(text);
  } catch (err) {
    console.warn(err);
    ui.loaderHelp.hidden = false;
    ui.cardCounter.textContent = '0/0';
    ui.questionText.textContent = 'Chargez le fichier CSV pour démarrer la révision.';
  }
}

init();
