(() => {
  'use strict';

  const DATA = 'data';
  const PER_PAGE = 30;

  const TAB_INFO = {
    dictionary: {
      title: 'Dictionary',
      eyebrow: 'English lexicon',
      desc: 'A complete English-to-English reference: headwords, IPA, word classes, grammar codes, and clear definitions.',
      defaultSort: 'relevance',
      filter: () => true,
    },
    defining: {
      title: 'Defining vocabulary',
      eyebrow: 'The core 3,000',
      desc: 'The controlled core of common English used as the foundation for explaining other words. Learn these first.',
      defaultSort: 'frequency',
      filter: (r) => r.flags.includes('d'),
    },
    idioms: {
      title: 'Idioms & expressions',
      eyebrow: 'Fixed and figurative language',
      desc: 'Idioms, proverbs, phrasal expressions, and fixed phrases. Meanings are not usually predictable from the individual words.',
      defaultSort: 'frequency',
      filter: (r) => r.flags.includes('i'),
    },
    phrasal: {
      title: 'Phrasal verbs',
      eyebrow: 'Verb + particle',
      desc: 'Common phrasal verbs with their particles, separability, and learner-friendly meanings.',
      defaultSort: 'frequency',
      filter: (r) => r.flags.includes('p'),
    },
    b2: {
      title: 'B2 vocabulary',
      eyebrow: 'Upper intermediate',
      desc: 'Words for confident everyday, study, and work communication.',
      defaultSort: 'frequency',
      filter: (r) => r.level === 'B2',
    },
    c1: {
      title: 'C1 vocabulary',
      eyebrow: 'Advanced',
      desc: 'Vocabulary for nuanced expression, academic reading, and professional contexts.',
      defaultSort: 'frequency',
      filter: (r) => r.level === 'C1',
    },
    c2: {
      title: 'C2 vocabulary',
      eyebrow: 'Near-native',
      desc: 'Very advanced and specialist vocabulary for precise comprehension and expression.',
      defaultSort: 'frequency',
      filter: (r) => r.level === 'C2',
    },
    slang: {
      title: 'Slang',
      eyebrow: 'Informal English',
      desc: 'Informal expressions from modern English, internet culture, and regional usage.',
      defaultSort: 'frequency',
      filter: (r) => r.flags.includes('s'),
    },
    offensive: {
      title: 'Strong language',
      eyebrow: 'Educational coverage',
      desc: 'Swear words and insults, labelled for register and severity. Slurs targeting protected groups are excluded.',
      defaultSort: 'frequency',
      filter: (r) => r.flags.includes('o'),
    },
    numbers: { title: 'Numbers & units', eyebrow: 'Reference', desc: 'Cardinal and ordinal numbers, date and time forms, measurement units, and a converter.', type: 'reference', ref: 'numbers-units.json' },
    pronunciation: { title: 'Pronunciation', eyebrow: 'Reference', desc: 'An IPA guide to English vowels, consonants, stress, rhythm, connected speech, and UK/US differences.', type: 'reference', ref: 'pronunciation.json' },
    grammar: { title: 'Grammar codes', eyebrow: 'Reference', desc: 'Word classes and the grammar labels used throughout the dictionary.', type: 'reference', ref: 'grammar.json' },
  };

  const SOURCE_LABELS = {
    curated: 'Curated content',
    cefr: 'CEFR-J / Octanove profiles',
    simplewikt: 'Simple English Wiktionary',
    wordnet: 'WordNet 3.0',
    enwikt: 'English Wiktionary',
    ipa: 'Open IPA Dict',
    kaikki: 'Wiktextract / English Wiktionary',
  };

  const state = {
    meta: null,
    total: 0,
    ids: [],
    words: [],
    keys: [],
    pos: [],
    levels: [],
    flags: [],
    freqs: [],
    ipas: [],
    variantTexts: [],
    variantMap: new Map(),
    chunks: null,
    chunkSize: 1000,
    chunkCache: new Map(),
    tab: 'dictionary',
    query: '',
    sort: 'relevance',
    page: 1,
    filtered: [],
    selected: null,
    refCache: new Map(),
    loadingIndex: true,
    requestId: 0,
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const el = {
    tabs: $$('.nav-tab'),
    panels: $$('.panel'),
    searchForm: $('#searchForm'),
    searchInput: $('#searchInput'),
    searchButton: $('#searchButton'),
    clearButton: $('#clearButton'),
    helpToggle: $('#helpToggle'),
    searchExamples: $('#searchExamples'),
    aboutButton: $('#aboutButton'),
    aboutDialog: $('#aboutDialog'),
    aboutStats: $('#aboutStats'),
    aboutMeta: $('#aboutMeta'),
    toast: $('#toast'),
    sectionNav: $('#sectionNav'),
  };

  function esc(value = '') {
    return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function normalize(value = '') {
    return String(value)
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[’‘]/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeKey(value = '') {
    return normalize(value).replace(/[^a-z0-9*?\s'-]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function debounce(fn, wait = 110) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  }

  function toast(message) {
    el.toast.textContent = message;
    el.toast.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.toast.classList.remove('show'), 2200);
  }

  async function getJSON(path) {
    const response = await fetch(path, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`Could not load ${path} (${response.status})`);
    return response.json();
  }

  function levelRank(level) {
    return { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 }[level] || 9;
  }

  function rowAt(index) {
    return {
      index,
      id: state.ids[index] || '',
      word: state.words[index] || '',
      pos: state.pos[index] || '',
      level: state.levels[index] || '',
      flags: state.flags[index] || '',
      freq: state.freqs[index] || 60000,
      ipa: state.ipas[index] || '',
      variants: state.variantTexts[index] || '',
    };
  }

  function wildcardRegex(query) {
    const body = normalize(query)
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    return new RegExp(`^${body}$`, 'i');
  }

  function scoreRow(index, query, regex, terms, wildcard) {
    const key = state.keys[index];
    let score = 0;
    if (wildcard) {
      if (!regex.test(key)) return 0;
      score = 620;
    } else {
      if (key === query) score = 1000;
      else if (state.variantMap.get(query) === index) score = 920;
      else if (key.startsWith(query)) score = 760;
      else if (key.includes(` ${query}`)) score = 690;
      else if (key.includes(query)) score = 540;
      else if (terms.length > 1 && terms.every((term) => key.includes(term))) score = 430;
      else return 0;
    }
    const row = rowAt(index);
    if (row.flags.includes('d')) score += 7;
    score += Math.max(0, 7 - levelRank(row.level));
    if (row.freq < 4000) score += 7;
    else if (row.freq < 12000) score += 3;
    score += Math.max(0, 4 - Math.min(4, key.length / 5));
    return score;
  }

  function collectFiltered(tab, query) {
    const info = TAB_INFO[tab];
    const results = [];
    const q = normalizeKey(query);
    if (!q) {
      for (let i = 0; i < state.total; i++) {
        const row = rowAt(i);
        if (info.filter(row)) results.push(i);
      }
      if (state.sort === 'frequency') {
        results.sort((a, b) => (rowAt(a).freq - rowAt(b).freq) || state.keys[a].localeCompare(state.keys[b]));
      }
      return results;
    }

    const wildcard = /[*?]/.test(q);
    const regex = wildcard ? wildcardRegex(q) : null;
    const terms = q.split(' ').filter(Boolean);
    const scored = [];
    for (let i = 0; i < state.total; i++) {
      const row = rowAt(i);
      if (!info.filter(row)) continue;
      const score = scoreRow(i, q, regex, terms, wildcard);
      if (score > 0) scored.push([i, score]);
    }
    if (state.sort === 'alpha') {
      scored.sort((a, b) => state.keys[a[0]].localeCompare(state.keys[b[0]]));
    } else if (state.sort === 'frequency') {
      scored.sort((a, b) => (rowAt(a[0]).freq - rowAt(b[0]).freq) || state.keys[a[0]].localeCompare(state.keys[b[0]]));
    } else {
      scored.sort((a, b) => (b[1] - a[1]) || (rowAt(a[0]).freq - rowAt(b[0]).freq) || state.keys[a[0]].localeCompare(state.keys[b[0]]));
    }
    return scored.map((x) => x[0]);
  }

  function highlight(text, query) {
    const safe = esc(text);
    const q = normalizeKey(query);
    if (!q || /[*?]/.test(q)) return safe;
    const lower = normalize(text);
    const at = lower.indexOf(q);
    if (at < 0) return safe;
    // Map normalized offsets only for the common case (no diacritics or apostrophes).
    const raw = String(text);
    const lowerRaw = raw.toLowerCase();
    const direct = lowerRaw.indexOf(q);
    if (direct < 0) return safe;
    return `${esc(raw.slice(0, direct))}<mark>${esc(raw.slice(direct, direct + q.length))}</mark>${esc(raw.slice(direct + q.length))}`;
  }

  function pageSlice(total) {
    const pages = Math.max(1, Math.ceil(total / PER_PAGE));
    const page = Math.min(Math.max(1, state.page), pages);
    state.page = page;
    return { pages, page, start: (page - 1) * PER_PAGE, end: page * PER_PAGE };
  }

  function renderPagination(pages, page) {
    if (pages <= 1) return '';
    let html = '<div class="pagination" aria-label="Pagination">';
    html += `<button class="page-button" type="button" data-page="${page - 1}" ${page === 1 ? 'disabled' : ''}>Previous</button>`;
    const windowSize = 2;
    for (let i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || Math.abs(i - page) <= windowSize) {
        html += `<button class="page-button ${i === page ? 'active' : ''}" type="button" data-page="${i}" ${i === page ? 'aria-current="page"' : ''}>${i}</button>`;
      } else if (Math.abs(i - page) === windowSize + 1) {
        html += '<span class="page-gap" aria-hidden="true">…</span>';
      }
    }
    html += `<button class="page-button" type="button" data-page="${page + 1}" ${page === pages ? 'disabled' : ''}>Next</button>`;
    html += '</div>';
    return html;
  }

  function renderResultRow(index, selected, query) {
    const row = rowAt(index);
    const flags = [];
    if (row.flags.includes('d')) flags.push('defining');
    if (row.flags.includes('i')) flags.push('idiom');
    if (row.flags.includes('p')) flags.push('phrasal');
    if (row.flags.includes('s')) flags.push('slang');
    if (row.flags.includes('o')) flags.push('strong language');
    const shownFlags = flags.slice(0, 2);
    return `<li>
      <button class="result-row ${index === selected ? 'active' : ''}" type="button" data-index="${index}">
        <span class="result-top">
          <span class="result-word">${highlight(row.word, query)}</span>
          ${row.ipa ? `<span class="result-ipa">${esc(row.ipa)}</span>` : ''}
        </span>
        <span class="result-meta">
          <span>${esc(row.pos)}</span>
          ${row.level ? `<span class="dot">·</span><span>${esc(row.level)}</span>` : ''}
          ${shownFlags.map((flag) => `<span class="dot">·</span><span class="result-flag ${flag === 'strong language' ? 'offensive' : ''}">${esc(flag)}</span>`).join('')}
        </span>
      </button>
    </li>`;
  }

  function renderSort() {
    const options = [
      ['relevance', 'Relevance'],
      ['alpha', 'A–Z'],
      ['frequency', 'Common first'],
    ];
    return `<label class="results-toolbar-label" for="sortSelect">Sort</label>
      <select class="sort-control" id="sortSelect" aria-label="Sort results">
        ${options.map(([value, label]) => `<option value="${value}" ${state.sort === value ? 'selected' : ''}>${label}</option>`).join('')}
      </select>`;
  }

  async function renderLexicon(tab) {
    const panel = $(`#panel-${tab}`);
    const info = TAB_INFO[tab];
    state.requestId += 1;
    const requestId = state.requestId;
    state.filtered = collectFiltered(tab, state.query);
    if (!state.selected && state.filtered.length) state.selected = state.filtered[0];
    if (state.selected != null && !state.filtered.includes(state.selected)) state.selected = state.filtered[0] || null;

    const total = state.filtered.length;
    const { pages, page, start, end } = pageSlice(total);
    const pageRows = state.filtered.slice(start, end);
    if (!state.selected && pageRows.length) state.selected = pageRows[0];

    panel.innerHTML = `
      <div class="section-head">
        <div>
          <p class="section-eyebrow">${esc(info.eyebrow || '')}</p>
          <h1 class="section-title">${esc(info.title)}</h1>
          <p class="section-desc">${esc(info.desc)}</p>
        </div>
        <span class="result-count">${total.toLocaleString()} ${total === 1 ? 'entry' : 'entries'}</span>
      </div>
      <div class="layout">
        <div class="results-card" aria-label="Results">
          <div class="results-toolbar">${renderSort()}</div>
          <ul class="results-list" id="results-list">
            ${pageRows.length ? pageRows.map((index) => renderResultRow(index, state.selected, state.query)).join('') : `<li class="empty-state"><div><h3>No matches</h3><p>Try a different spelling, remove wildcards, or search the full dictionary.</p><button class="text-button" type="button" data-action="search-all">Search all dictionary</button></div></li>`}
          </ul>
          ${renderPagination(pages, page)}
        </div>
        <article class="detail-card" id="detail-card" aria-live="polite"></article>
      </div>`;

    wirePanelEvents(panel, tab);
    if (state.selected != null) await renderDetail(state.selected, requestId);
    else $('#detail-card').innerHTML = emptyDetail();
  }

  function wirePanelEvents(panel, tab) {
    $$('.result-row', panel).forEach((button) => {
      button.addEventListener('click', () => selectRow(Number(button.dataset.index), tab));
    });
    $$('.page-button[data-page]', panel).forEach((button) => {
      button.addEventListener('click', () => {
        const next = Number(button.dataset.page);
        if (!next || next === state.page) return;
        state.page = next;
        renderLexicon(tab);
      });
    });
    const searchAll = $('[data-action="search-all"]', panel);
    if (searchAll) {
      searchAll.addEventListener('click', () => {
        state.query = el.searchInput.value;
        switchTab('dictionary', true);
      });
    }
    const sort = $('#sortSelect', panel);
    if (sort) {
      sort.addEventListener('change', () => {
        state.sort = sort.value;
        state.page = 1;
        renderLexicon(tab);
      });
    }
  }

  function emptyDetail() {
    return `<div class="empty-state"><div><h3>Select a word</h3><p>Choose an entry from the list to see its pronunciation, definitions, grammar, and examples.</p></div></div>`;
  }

  function mobileTopbar(word) {
    return `<div class="detail-topbar">
      <button class="back-button" type="button" data-action="close-detail">Back</button>
      <span class="detail-topbar-label">${esc(word)}</span>
    </div>`;
  }

  async function renderDetail(index, requestId = state.requestId) {
    const detail = $('#detail-card');
    if (!detail) return;
    detail.innerHTML = `<div class="loading-state">Loading entry…</div>`;
    const row = rowAt(index);
    try {
      const entry = await getEntry(index);
      if (requestId !== state.requestId) return;
      if (!entry) {
        detail.innerHTML = emptyDetail();
        return;
      }
      detail.innerHTML = renderEntry(entry);
      const back = $('[data-action="close-detail"]', detail);
      if (back) back.addEventListener('click', closeDetail);
    } catch (error) {
      console.error(error);
      detail.innerHTML = `<div class="empty-state"><div><h3>Could not load this entry</h3><p>${esc(error.message)}</p></div></div>`;
    }
  }

  function selectRow(index, tab) {
    state.selected = index;
    const panel = $(`#panel-${tab}`);
    $$('.result-row', panel).forEach((button) => {
      button.classList.toggle('active', Number(button.dataset.index) === index);
    });
    renderDetail(index);
    if (window.matchMedia('(max-width: 980px)').matches) {
      document.body.classList.add('detail-open');
      const detail = $('#detail-card');
      if (detail) detail.scrollTop = 0;
    }
  }

  function closeDetail() {
    document.body.classList.remove('detail-open');
  }

  async function getEntry(index) {
    const chunkIndex = Math.floor(index / state.chunkSize);
    if (!state.chunkCache.has(chunkIndex)) {
      const chunk = state.chunks.chunks[chunkIndex];
      if (!chunk) return null;
      const data = await getJSON(`${DATA}/${chunk.file}`);
      state.chunkCache.set(chunkIndex, data);
    }
    const chunk = state.chunkCache.get(chunkIndex);
    const chunkInfo = state.chunks.chunks[chunkIndex];
    return chunk[index - chunkInfo.start] || null;
  }

  function renderEntry(entry) {
    const word = entry.word || '';
    const ipaUK = entry.ipa_uk || '';
    const ipaUS = entry.ipa_us || '';
    const sameIPA = ipaUK && ipaUS && ipaUK === ipaUS;
    const badges = [];
    if (entry.level) badges.push(`<span class="badge level">${esc(entry.level)}</span>`);
    if (entry.pos) badges.push(`<span class="badge">${esc(entry.pos)}</span>`);
    if (entry.defining) badges.push('<span class="badge defining">Defining vocabulary</span>');
    if (entry.register && entry.register !== 'neutral' && entry.register !== entry.pos) badges.push(`<span class="badge ${entry.register === 'offensive' ? 'offensive' : ''}">${esc(entry.register)}</span>`);

    const senses = (entry.senses || []).map((sense, si) => {
      const defs = (sense.defs || []).map((def, di) => {
        const labels = (def.labels || []).length
          ? `<div class="def-labels">${def.labels.map((label) => `<span class="label-chip">${esc(label)}</span>`).join('')}</div>`
          : '';
        return `<li class="def-item">
          <span class="def-number">${di + 1}</span>
          <div>
            <div class="def-text">${esc(def.text)}</div>
            ${def.example ? `<div class="def-example">${esc(def.example)}</div>` : ''}
            ${labels}
          </div>
        </li>`;
      }).join('');
      const gram = sense.grammar && sense.grammar !== sense.pos ? `<span class="sense-grammar">${esc(sense.grammar)}</span>` : '';
      const level = sense.level ? `<span class="sense-level">${esc(sense.level)}</span>` : '';
      const register = sense.register && sense.register !== 'neutral' ? `<span class="sense-register">${esc(sense.register)}</span>` : '';
      const note = sense.note ? `<div class="def-example">${esc(sense.note)}</div>` : '';
      return `<section class="sense">
        <div class="sense-head">
          <span class="sense-pos">${esc(sense.pos || entry.pos || 'entry')}</span>
          ${level}${gram}${register}
        </div>
        <ol class="def-list">${defs || '<li class="def-item"><span></span><div class="def-text">No definition available.</div></li>'}</ol>
        ${note}
      </section>`;
    }).join('');

    const allSynonyms = [...new Set((entry.senses || []).flatMap((sense) => sense.synonyms || []))].slice(0, 10);
    const allAntonyms = [...new Set((entry.senses || []).flatMap((sense) => sense.antonyms || []))].slice(0, 10);
    const themes = (entry.themes || []).filter((theme) => !['dictionary', 'b2', 'c1', 'c2'].includes(theme));

    const metaBlocks = [];
    if (entry.pos) {
      const grammar = entry.grammar && entry.grammar !== entry.pos ? ` <span class="ipa">${esc(entry.grammar)}</span>` : '';
      metaBlocks.push(`<div class="meta-block"><h3>Word class</h3><p>${esc(entry.pos)}${grammar}</p></div>`);
    }
    if (entry.level) metaBlocks.push(`<div class="meta-block"><h3>CEFR level</h3><p>${esc(entry.level)}</p></div>`);
    if (entry.frequency && entry.frequency < 60000) metaBlocks.push(`<div class="meta-block"><h3>Frequency rank</h3><p>${entry.frequency.toLocaleString()}</p></div>`);
    if (entry.region) metaBlocks.push(`<div class="meta-block"><h3>Region</h3><p>${esc(entry.region)}</p></div>`);
    if (entry.variants && entry.variants.length) {
      metaBlocks.push(`<div class="meta-block"><h3>Variants</h3><ul class="chip-list">${entry.variants.slice(0, 10).map((variant) => `<li>${esc(variant)}</li>`).join('')}</ul></div>`);
    }
    if (allSynonyms.length) {
      metaBlocks.push(`<div class="meta-block"><h3>Synonyms</h3><ul class="chip-list">${allSynonyms.map((syn) => `<li>${esc(syn)}</li>`).join('')}</ul></div>`);
    }
    if (allAntonyms.length) {
      metaBlocks.push(`<div class="meta-block"><h3>Antonyms</h3><ul class="chip-list">${allAntonyms.map((ant) => `<li>${esc(ant)}</li>`).join('')}</ul></div>`);
    }
    if (themes.length) {
      metaBlocks.push(`<div class="meta-block"><h3>Themes</h3><ul class="chip-list">${themes.map((theme) => `<li>${esc(theme)}</li>`).join('')}</ul></div>`);
    }
    if (entry.separable != null) {
      metaBlocks.push(`<div class="meta-block"><h3>Separable</h3><p>${entry.separable ? 'Yes — the object can come between the verb and particle.' : 'Usually not separable.'}</p></div>`);
    }
    if (entry.severity) metaBlocks.push(`<div class="meta-block"><h3>Severity</h3><p>${esc(entry.severity)}</p></div>`);

    const source = (entry.source || []).map((code) => SOURCE_LABELS[code] || code).join(' · ');
    const warning = entry.warning ? `<div class="warning-box"><strong>Usage note:</strong> ${esc(entry.warning)}</div>` : '';

    return `${mobileTopbar(word)}
      <header class="entry-head">
        <h1 class="entry-word">${esc(word)}</h1>
        <div class="ipa-row">
          ${sameIPA ? `<span class="ipa-item"><span class="ipa-label">IPA</span><span class="ipa-value">${esc(ipaUS)}</span></span>` : ''}
          ${!sameIPA && ipaUK ? `<span class="ipa-item"><span class="ipa-label">UK</span><span class="ipa-value">${esc(ipaUK)}</span></span>` : ''}
          ${!sameIPA && ipaUS ? `<span class="ipa-item"><span class="ipa-label">US</span><span class="ipa-value">${esc(ipaUS)}</span></span>` : ''}
          ${!ipaUK && !ipaUS ? '<span class="ipa-item"><span class="ipa-label">IPA</span><span class="ipa-value">—</span></span>' : ''}
        </div>
        <div class="entry-badges">${badges.join('')}</div>
      </header>
      ${warning}
      <div class="senses">${senses}</div>
      ${metaBlocks.length ? `<div class="entry-meta">${metaBlocks.join('')}</div>` : ''}
      <p class="source-line">${source ? `Sources: ${esc(source)}.` : ''}${entry.ipa_auto ? ' IPA for this rare headword was generated automatically.' : ''}</p>`;
  }

  async function ensureRef(name) {
    if (state.refCache.has(name)) return state.refCache.get(name);
    const data = await getJSON(`${DATA}/${name}`);
    state.refCache.set(name, data);
    return data;
  }

  function renderTable(headers, rows) {
    return `<div class="table-scroll"><table>
      <thead><tr>${headers.map((h) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>`;
  }

  function renderNumbers(data) {
    const sections = data.numberSections || [];
    const unitSections = data.unitSections || [];
    const conversions = data.conversions || {};
    const catOptions = Object.keys(conversions).map((key) => `<option value="${esc(key)}">${esc(key.charAt(0).toUpperCase() + key.slice(1))}</option>`).join('');
    return `
      <div class="section-head">
        <div>
          <p class="section-eyebrow">Reference</p>
          <h1 class="section-title">Numbers &amp; units</h1>
          <p class="section-desc">${esc(data.intro || '')}</p>
        </div>
      </div>
      <div class="ref-stack">
        <section class="ref-card">
          <h3>Unit converter</h3>
          <p>Convert common units. Temperature uses offset formulas; other categories use linear factors.</p>
          <div class="converter-form">
            <label class="field"><span>Category</span><select id="convCategory">${catOptions}</select></label>
            <label class="field"><span>Value</span><input id="convValue" type="number" step="any" value="1"></label>
            <label class="field"><span>From</span><select id="convFrom"></select></label>
            <label class="field"><span>To</span><select id="convTo"></select></label>
          </div>
          <div class="converter-result" id="convResult">1</div>
        </section>
        ${sections.map((section) => `<section class="ref-card">
          <h3>${esc(section.title)}</h3>
          <p>${esc(section.intro || '')}</p>
          ${renderTable(['Term', 'Symbol', 'IPA', 'Meaning', 'Example'], (section.entries || []).map((item) => [
            `<strong>${esc(item.word)}</strong>`,
            esc(item.symbol || ''),
            `<span class="ipa">${esc(item.ipa || '')}</span>`,
            esc(item.explanation || ''),
            esc(item.example || ''),
          ]))}
        </section>`).join('')}
        ${unitSections.map((section) => `<section class="ref-card">
          <h3>${esc(section.title)}</h3>
          <p>${esc(section.intro || '')}</p>
          ${renderTable(['Name', 'Symbol', 'Quantity', 'Definition', 'Relation', 'Example'], (section.entries || []).map((item) => [
            `<strong>${esc(item.name)}</strong>`,
            esc(item.symbol || ''),
            esc(item.quantity || ''),
            esc(item.definition || ''),
            esc(item.relation || ''),
            esc(item.example || ''),
          ]))}
        </section>`).join('')}
        <section class="ref-card">
          <h3>Useful number phrases</h3>
          <div class="ref-grid">${(data.phrases || []).map((item) => `<div class="ref-tile"><h4>${esc(item.phrase)}</h4><p>${esc(item.meaning)}</p><p><em>${esc(item.example)}</em></p></div>`).join('')}</div>
        </section>
      </div>`;
  }

  function wireConverter(data) {
    const conversions = data.conversions || {};
    const category = $('#convCategory');
    const from = $('#convFrom');
    const to = $('#convTo');
    const value = $('#convValue');
    const result = $('#convResult');
    if (!category || !from || !to || !value || !result) return;

    function fillUnits() {
      const group = conversions[category.value];
      if (!group) return;
      const options = group.units.map((unit) => `<option value="${esc(unit.symbol)}">${esc(unit.name)} (${esc(unit.symbol)})</option>`).join('');
      from.innerHTML = options;
      to.innerHTML = options;
      if (group.units[1]) to.selectedIndex = 1;
      calculate();
    }

    function calculate() {
      const group = conversions[category.value];
      if (!group) return;
      const number = parseFloat(value.value);
      if (Number.isNaN(number)) {
        result.textContent = 'Enter a number';
        return;
      }
      const fromUnit = from.value;
      const toUnit = to.value;
      let output;
      if (category.value === 'temperature') {
        let celsius = number;
        if (fromUnit === '°F') celsius = ((number - 32) * 5) / 9;
        if (fromUnit === 'K') celsius = number - 273.15;
        output = celsius;
        if (toUnit === '°F') output = (celsius * 9) / 5 + 32;
        if (toUnit === 'K') output = celsius + 273.15;
      } else {
        const source = group.units.find((unit) => unit.symbol === fromUnit);
        const target = group.units.find((unit) => unit.symbol === toUnit);
        if (!source || !target) {
          result.textContent = '—';
          return;
        }
        output = (number * source.factor) / target.factor;
      }
      const pretty = Math.abs(output) >= 1e6 || (Math.abs(output) > 0 && Math.abs(output) < 0.001)
        ? output.toExponential(6)
        : Number(output.toFixed(8)).toString();
      result.textContent = `${number} ${fromUnit} = ${pretty} ${toUnit}`;
    }

    category.addEventListener('change', fillUnits);
    [from, to, value].forEach((node) => node.addEventListener('input', calculate));
    fillUnits();
  }

  function renderPronunciation(data) {
    const table = (items) => renderTable(['Symbol', 'Type', 'Example', 'IPA', 'Common spellings', 'Description'], (items || []).map((item) => [
      `<span class="ipa">${esc(item.symbol)}</span>`,
      esc(item.type || ''),
      esc(item.example || ''),
      `<span class="ipa">${esc(item.ipa || '')}</span>`,
      esc(item.spelling || ''),
      esc(item.description || ''),
    ]));
    return `
      <div class="section-head">
        <div>
          <p class="section-eyebrow">Reference</p>
          <h1 class="section-title">Pronunciation</h1>
          <p class="section-desc">${esc(data.intro || '')}</p>
        </div>
      </div>
      <div class="ref-stack">
        <section class="ref-card"><h3>Monophthongs</h3>${table(data.vowels)}</section>
        <section class="ref-card"><h3>Diphthongs</h3>${table(data.diphthongs)}</section>
        <section class="ref-card"><h3>Consonants</h3>${table(data.consonants)}</section>
        <section class="ref-card"><h3>Stress and rhythm</h3><p>${esc(data.stress?.summary || '')}</p>
          <div class="ref-grid">${(data.stress?.rules || []).map((rule) => `<div class="ref-tile"><h4>${esc(rule.title)}</h4><p>${esc(rule.text)}</p></div>`).join('')}</div>
          <div class="mini-head">Examples</div>
          ${renderTable(['Word', 'IPA', 'Note'], (data.stress?.examples || []).map((item) => [esc(item.word), `<span class="ipa">${esc(item.ipa)}</span>`, esc(item.note)]))}
        </section>
        <section class="ref-card"><h3>Connected speech</h3>
          <div class="ref-grid">${(data.connectedSpeech || []).map((rule) => `<div class="ref-tile"><h4>${esc(rule.title)}</h4><p>${esc(rule.text)}</p><p><span class="ipa">${esc(rule.example || '')}</span></p></div>`).join('')}</div>
        </section>
        <section class="ref-card"><h3>UK / US differences</h3>
          ${renderTable(['Feature', 'UK', 'US', 'Examples'], (data.ukUs || []).map((item) => [esc(item.feature), esc(item.uk), esc(item.us), esc((item.examples || []).join('; '))]))}
        </section>
        <section class="ref-card"><h3>Minimal pairs</h3>
          ${renderTable(['Pair', 'IPA', 'Note'], (data.minimalPairs || []).map((item) => [esc((item.pair || []).join(' / ')), `<span class="ipa">${esc((item.ipa || []).join(' / '))}</span>`, esc(item.note || '')]))}
        </section>
      </div>`;
  }

  function renderGrammar(data) {
    return `
      <div class="section-head">
        <div>
          <p class="section-eyebrow">Reference</p>
          <h1 class="section-title">Grammar codes</h1>
          <p class="section-desc">${esc(data.intro || '')}</p>
        </div>
      </div>
      <div class="ref-stack">
        <section class="ref-card"><h3>Word classes</h3>
          ${renderTable(['Code', 'Word class', 'Summary', 'Examples', 'Notes'], (data.wordClasses || []).map((item) => [
            `<strong>${esc(item.code)}</strong>`, esc(item.name), esc(item.summary), esc((item.examples || []).join(', ')), esc(item.notes || ''),
          ]))}
        </section>
        <section class="ref-card"><h3>Grammar codes in entries</h3>
          ${renderTable(['Code', 'Meaning', 'Example'], (data.grammarCodes || []).map((item) => [`<strong>${esc(item.code)}</strong>`, esc(item.meaning), esc(item.example)]))}
        </section>
        ${(data.sections || []).map((section) => `<section class="ref-card"><h3>${esc(section.title)}</h3>${(section.body || []).map((paragraph) => `<p>${esc(paragraph)}</p>`).join('')}${section.examples ? `<div class="ref-grid">${section.examples.map((example) => `<div class="ref-tile"><h4>Example</h4><p>${esc(example.text)}</p>${example.note ? `<p><em>${esc(example.note)}</em></p>` : ''}</div>`).join('')}</div>` : ''}</section>`).join('')}
      </div>`;
  }

  async function renderReference(tab) {
    const panel = $(`#panel-${tab}`);
    const info = TAB_INFO[tab];
    panel.innerHTML = `<div class="loading-state">Loading ${esc(info.title.toLowerCase())}…</div>`;
    try {
      const data = await ensureRef(info.ref);
      if (tab === 'numbers') {
        panel.innerHTML = renderNumbers(data);
        wireConverter(data);
      } else if (tab === 'pronunciation') {
        panel.innerHTML = renderPronunciation(data);
      } else {
        panel.innerHTML = renderGrammar(data);
      }
    } catch (error) {
      console.error(error);
      panel.innerHTML = `<div class="empty-state"><div><h3>Could not load this section</h3><p>${esc(error.message)}</p></div></div>`;
    }
  }

  async function renderCurrentTab() {
    const info = TAB_INFO[state.tab];
    if (info.type === 'reference') await renderReference(state.tab);
    else await renderLexicon(state.tab);
  }

  function syncTabs() {
    el.tabs.forEach((tab) => {
      const active = tab.dataset.tab === state.tab;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      tab.tabIndex = active ? 0 : -1;
    });
    el.panels.forEach((panel) => {
      const active = panel.dataset.panel === state.tab;
      panel.hidden = !active;
      panel.classList.toggle('active', active);
    });
  }

  function switchTab(tab, keepQuery = false) {
    if (!TAB_INFO[tab] || state.tab === tab) return;
    state.tab = tab;
    state.page = 1;
    state.selected = null;
    state.sort = TAB_INFO[tab].defaultSort || 'relevance';
    if (!keepQuery && TAB_INFO[tab].type === 'reference') {
      state.query = '';
      el.searchInput.value = '';
      el.clearButton.hidden = true;
    }
    closeDetail();
    syncTabs();
    history.replaceState(null, '', `#${tab}`);
    renderCurrentTab().catch((error) => {
      console.error(error);
      toast('Could not load this section');
    });
  }

  function search() {
    const value = el.searchInput.value;
    state.query = value;
    el.clearButton.hidden = !value;
    if (TAB_INFO[state.tab].type === 'reference') {
      switchTab('dictionary', true);
      return;
    }
    state.page = 1;
    state.selected = null;
    renderLexicon(state.tab).catch((error) => {
      console.error(error);
      toast('Search failed');
    });
  }

  const debouncedSearch = debounce(search, 130);

  function updateSearchHelp() {
    el.helpToggle.setAttribute('aria-expanded', String(!el.searchExamples.hidden));
  }

  function bindEvents() {
    el.searchForm.addEventListener('submit', (event) => {
      event.preventDefault();
      search();
      el.searchInput.blur();
    });
    el.searchInput.addEventListener('input', () => {
      el.clearButton.hidden = !el.searchInput.value;
      if (TAB_INFO[state.tab].type === 'reference') return;
      debouncedSearch();
    });
    el.clearButton.addEventListener('click', () => {
      el.searchInput.value = '';
      el.clearButton.hidden = true;
      state.query = '';
      state.page = 1;
      renderLexicon(state.tab);
      el.searchInput.focus();
    });
    el.helpToggle.addEventListener('click', () => {
      el.searchExamples.hidden = !el.searchExamples.hidden;
      updateSearchHelp();
    });
    $$('.example-link').forEach((button) => {
      button.addEventListener('click', () => {
        el.searchInput.value = button.dataset.q || '';
        el.clearButton.hidden = false;
        search();
      });
    });

    el.tabs.forEach((tab) => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
      tab.addEventListener('keydown', (event) => {
        if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const index = el.tabs.indexOf(tab);
        let next = index;
        if (event.key === 'ArrowRight') next = (index + 1) % el.tabs.length;
        if (event.key === 'ArrowLeft') next = (index - 1 + el.tabs.length) % el.tabs.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = el.tabs.length - 1;
        el.tabs[next].focus();
        switchTab(el.tabs[next].dataset.tab);
      });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        event.preventDefault();
        el.searchInput.focus();
        el.searchInput.select();
      }
      if (event.key === 'Escape') {
        if (document.body.classList.contains('detail-open')) closeDetail();
        else if (document.activeElement === el.searchInput && el.searchInput.value) {
          el.searchInput.value = '';
          el.clearButton.hidden = true;
          state.query = '';
          renderLexicon(state.tab);
        }
      }
    });

    el.aboutButton.addEventListener('click', () => {
      if (el.aboutDialog.showModal) el.aboutDialog.showModal();
    });
    el.aboutDialog.addEventListener('click', (event) => {
      if (event.target === el.aboutDialog) el.aboutDialog.close();
    });

    window.addEventListener('resize', () => {
      if (!window.matchMedia('(max-width: 980px)').matches) closeDetail();
    });

    window.addEventListener('popstate', () => {
      const hash = location.hash.replace('#', '');
      if (TAB_INFO[hash] && hash !== state.tab) switchTab(hash);
    });
  }

  function setAbout() {
    if (!state.meta || !el.aboutStats) return;
    const values = [
      ['Entries', state.meta.total],
      ['Idioms & expressions', state.meta.idioms],
      ['Defining vocabulary', state.meta.defining],
      ['IPA coverage', '100%'],
    ];
    el.aboutStats.innerHTML = values.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${typeof value === 'number' ? value.toLocaleString() : esc(value)}</dd></div>`).join('');
    if (el.aboutMeta) {
      el.aboutMeta.textContent = `Built ${state.meta.generated || ''} · ${state.meta.total.toLocaleString()} headwords · ${state.meta.idioms.toLocaleString()} idioms and expressions · ${state.meta.defining.toLocaleString()} defining words.`;
    }
  }

  async function loadIndex() {
    const response = await fetch(`${DATA}/index.tsv`, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`Could not load the search index (${response.status})`);
    const text = await response.text();
    const lines = text.split('\n');
    if (lines.length < 2) throw new Error('The search index is empty.');
    lines.shift();
    if (lines.length && !lines[lines.length - 1]) lines.pop();
    state.total = lines.length;
    state.ids = new Array(state.total);
    state.words = new Array(state.total);
    state.keys = new Array(state.total);
    state.pos = new Array(state.total);
    state.levels = new Array(state.total);
    state.flags = new Array(state.total);
    state.freqs = new Array(state.total);
    state.ipas = new Array(state.total);
    state.variantTexts = new Array(state.total);
    for (let i = 0; i < state.total; i++) {
      const fields = lines[i].split('\t');
      state.ids[i] = fields[0] || '';
      state.words[i] = fields[1] || '';
      state.pos[i] = fields[2] || '';
      state.levels[i] = fields[3] || '';
      state.flags[i] = fields[4] || '';
      state.freqs[i] = Number(fields[5]) || 60000;
      state.ipas[i] = fields[6] || '';
      const variants = fields[7] || '';
      state.variantTexts[i] = variants;
      const key = normalizeKey(state.words[i]);
      state.keys[i] = key;
      if (variants) {
        for (const variant of variants.split('|')) {
          const v = normalizeKey(variant);
          if (v && !state.variantMap.has(v)) state.variantMap.set(v, i);
        }
      }
    }
    state.loadingIndex = false;
  }

  function renderInitialSkeleton() {
    $('#panel-dictionary').innerHTML = `
      <div class="section-head">
        <div><p class="section-eyebrow">English lexicon</p><h1 class="section-title">Dictionary</h1><p class="section-desc">A complete English-to-English reference with IPA, word classes, grammar codes, and clear definitions.</p></div>
      </div>
      <div class="layout">
        <div class="results-card"><div class="results-toolbar"><span class="skeleton" style="width:80px;height:12px"></span></div>
          <div style="padding:14px;display:grid;gap:14px">${Array.from({ length: 8 }, () => '<div class="skeleton" style="height:34px"></div>').join('')}</div>
        </div>
        <div class="detail-card"><div class="skeleton" style="width:45%;height:38px;margin-bottom:14px"></div><div class="skeleton" style="width:30%;height:14px;margin-bottom:26px"></div>${Array.from({ length: 5 }, () => '<div class="skeleton" style="height:14px;margin-bottom:10px"></div>').join('')}</div>
      </div>`;
  }

  async function init() {
    bindEvents();
    renderInitialSkeleton();
    try {
      const [meta, chunks] = await Promise.all([getJSON(`${DATA}/meta.json`), getJSON(`${DATA}/chunks.json`)]);
      state.meta = meta;
      state.chunks = chunks;
      state.chunkSize = chunks.chunkSize || 1000;
      await loadIndex();
      setAbout();
      const hash = location.hash.replace('#', '');
      if (TAB_INFO[hash]) state.tab = hash;
      state.sort = TAB_INFO[state.tab].defaultSort || 'relevance';
      syncTabs();
      await renderCurrentTab();
    } catch (error) {
      console.error(error);
      $('#panel-dictionary').innerHTML = `<div class="empty-state"><div><h3>Could not load the dictionary</h3><p>${esc(error.message)}</p><p>Make sure the <code>data/</code> folder is next to <code>index.html</code>.</p></div></div>`;
    }
  }

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
