(() => {
  'use strict';
  const DATA = 'data';
  const state = {
    meta: null,
    search: [],
    chunks: null,
    chunkCache: new Map(),
    entryById: new Map(),
    idToIndex: new Map(),
    ref: {},
    tab: 'dictionary',
    query: '',
    sort: 'relevance',
    density: 'comfortable',
    page: 1,
    perPage: 25,
    filtered: [],
    selectedId: null,
    loading: false,
  };
  const $ = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));
  const el = {
    tabs: $$('.tab'),
    panels: $$('.panel'),
    searchInput: $('#searchInput'),
    clearSearch: $('#clearSearch'),
    searchBtn: $('#searchBtn'),
    sortSelect: $('#sortSelect'),
    densitySelect: $('#densitySelect'),
    toast: $('#toast'),
  };

  const TAB_INFO = {
    dictionary: {title:'Dictionary', desc:'Browse the full English-to-English dictionary. Use wildcards, sort modes, and CEFR labels to explore words quickly.', type:'lexicon'},
    defining: {title:'Defining Vocabulary', desc:'A controlled core of up to 3,000 common words. These words are intended as the base for understanding other definitions.', type:'lexicon', filter: e => e.d===1},
    phrasal: {title:'Phrasal Verbs', desc:'Common phrasal verbs with particle behavior, separability, and learner-friendly meanings.', type:'lexicon', filter: e => e.t.includes('phrasal')},
    b2: {title:'B2 Words', desc:'Upper-intermediate vocabulary for confident everyday, study, and work communication.', type:'lexicon', filter: e => e.l==='B2'},
    c1: {title:'C1 Words', desc:'Advanced vocabulary for nuanced expression, academic reading, and professional contexts.', type:'lexicon', filter: e => e.l==='C1'},
    c2: {title:'C2 Words', desc:'Very advanced vocabulary for precise, near-native comprehension and expression.', type:'lexicon', filter: e => e.l==='C2'},
    slang: {title:'Slang', desc:'Informal expressions from modern English, internet culture, and regional usage. Labels show region and era where relevant.', type:'lexicon', filter: e => e.t.includes('slang')},
    offensive: {title:'Strong Language', desc:'Educational, clinical coverage of common swear words and insults. Slurs targeting protected groups are excluded.', type:'lexicon', filter: e => e.t.includes('offensive')},
    numbers: {title:'Numbers & Units', desc:'Cardinal and ordinal numbers, date/time forms, measurement units, and a built-in converter.', type:'reference', ref:'numbers-units.json'},
    pronunciation: {title:'Pronunciation Guide', desc:'IPA symbols, stress, connected speech, and UK/US pronunciation notes.', type:'reference', ref:'pronunciation.json'},
    grammar: {title:'Grammar Codes', desc:'Word classes and dictionary grammar labels used throughout the lexicon.', type:'reference', ref:'grammar.json'},
  };

  function esc(s='') { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function norm(s='') { return String(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/['’]/g,"'").replace(/[^a-z0-9*?\s-]/g,' ').replace(/\s+/g,' ').trim(); }
  function debounce(fn, ms=180){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; }
  function toast(msg){ el.toast.textContent=msg; el.toast.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(()=>el.toast.classList.remove('show'),2200); }

  async function getJSON(path){
    const r = await fetch(path, {cache:'force-cache'});
    if(!r.ok) throw new Error(`Failed to load ${path}: ${r.status}`);
    return r.json();
  }

  function setStats(){
    if(!state.meta) return;
    $('#statTotal').textContent = state.meta.total.toLocaleString();
    $('#statDefining').textContent = state.meta.defining.toLocaleString();
    $('#statLevels').textContent = Object.keys(state.meta.levels).length + ' levels';
    for (const [k,v] of Object.entries(state.meta.themes||{})) {
      const c = $(`#count-${k}`); if(c) c.textContent = v.toLocaleString();
    }
    const dCount = $('#count-dictionary'); if(dCount) dCount.textContent = state.meta.total.toLocaleString();
  }

  function wildcardToRegex(q){
    // Escape regex chars except * and ?
    const escaped = q.replace(/[.+^${}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*').replace(/\?/g,'.');
    return new RegExp('^'+escaped+'$','i');
  }
  function hasWildcard(q){ return /[*?]/.test(q); }

  function scoreEntry(item, q, nq, rx){
    const w = item.w || '';
    const k = item.k || norm(w);
    const variants = item.v || [];
    const gloss = item.g || '';
    let score = 0;
    const fields = [k, ...variants.map(norm), norm(gloss)];
    if(!nq) return 1;
    if(hasWildcard(q)) {
      if(rx.test(k)) score += 120;
      else if(variants.some(v=>rx.test(norm(v)))) score += 100;
      else if(rx.test(norm(gloss))) score += 30;
      else if(rx.test(norm(w.replace(/\s+/g,'')))) score += 80;
      else return 0;
      // Prefer shorter/closer matches
      score += Math.max(0, 20 - Math.min(20, k.length/2));
      return score;
    }
    if(k === nq) score += 200;
    else if(variants.some(v=>norm(v)===nq)) score += 170;
    else if(k.startsWith(nq)) score += 120;
    else if(variants.some(v=>norm(v).startsWith(nq))) score += 100;
    else if(k.includes(nq)) score += 80;
    else if(variants.some(v=>norm(v).includes(nq))) score += 65;
    else if(norm(gloss).includes(nq)) score += 35;
    else {
      // token overlap / fuzzy-lite
      const qt = nq.split(' ').filter(Boolean);
      const hay = (k+' '+variants.join(' ')+' '+norm(gloss));
      const hits = qt.filter(t=>hay.includes(t)).length;
      if(hits===qt.length && qt.length) score += 45;
      else return 0;
    }
    // small boosts
    if(item.d) score += 2;
    score += Math.max(0, 8 - Math.floor((item.f||50000)/8000));
    return score;
  }

  function sortItems(items, mode, q){
    const arr = items.slice();
    const nq = norm(q);
    if(mode==='alpha') arr.sort((a,b)=>a.w.localeCompare(b.w) || a.l.localeCompare(b.l));
    else if(mode==='level') arr.sort((a,b)=>levelRank(a.l)-levelRank(b.l) || a.w.localeCompare(b.w));
    else if(mode==='frequency') arr.sort((a,b)=>(a.f||50000)-(b.f||50000) || a.w.localeCompare(b.w));
    else { // relevance
      arr.sort((a,b)=>(b._score||0)-(a._score||0) || (a.f||50000)-(b.f||50000) || a.w.localeCompare(b.w));
      if(!nq) arr.sort((a,b)=> (a.f||50000)-(b.f||50000) || a.w.localeCompare(b.w));
    }
    return arr;
  }
  function levelRank(l){ return ({A1:1,A2:2,B1:3,B2:4,C1:5,C2:6})[l] || 9; }

  function getBaseItems(tab){
    const info = TAB_INFO[tab];
    let items = state.search;
    if(info.filter) items = items.filter(info.filter);
    return items;
  }

  function applyFilters(){
    const tab = state.tab;
    const info = TAB_INFO[tab];
    if(info.type !== 'lexicon') return;
    const q = state.query.trim();
    const nq = norm(q);
    const rx = hasWildcard(q) ? wildcardToRegex(norm(q).replace(/\s+/g,' ')) : null;
    let items = getBaseItems(tab);
    if(nq) {
      const out = [];
      for(const it of items){
        const s = scoreEntry(it, q, nq, rx);
        if(s>0) out.push({...it, _score:s});
      }
      items = out;
    } else {
      items = items.map(it=>({...it, _score:1}));
    }
    items = sortItems(items, nq ? state.sort : (state.sort==='relevance' ? 'frequency' : state.sort), q);
    state.filtered = items;
    state.page = 1;
    if(state.selectedId && !items.some(x=>x.id===state.selectedId)) state.selectedId = items[0]?.id || null;
    if(!state.selectedId) state.selectedId = items[0]?.id || null;
  }

  async function loadChunkForIndex(i){
    const chunkIndex = Math.floor(i / state.chunks.chunkSize);
    if(state.chunkCache.has(chunkIndex)) return state.chunkCache.get(chunkIndex);
    const file = state.chunks.chunks[chunkIndex].file;
    const data = await getJSON(`${DATA}/${file}`);
    state.chunkCache.set(chunkIndex, data);
    for(const e of data) { state.entryById.set(e.id, e); }
    return data;
  }

  async function getEntry(id){
    if(state.entryById.has(id)) return state.entryById.get(id);
    const idx = state.idToIndex.get(id);
    if(idx==null) return null;
    await loadChunkForIndex(idx);
    return state.entryById.get(id) || null;
  }

  function paginate(items){
    const total = items.length;
    const pages = Math.max(1, Math.ceil(total/state.perPage));
    const page = Math.min(Math.max(1,state.page), pages);
    state.page = page;
    const start = (page-1)*state.perPage;
    return {items: items.slice(start,start+state.perPage), total, pages, page, start};
  }

  function badge(text, cls=''){ return `<span class="badge ${cls}">${esc(text)}</span>`; }
  function levelBadge(l){ return l ? badge(l,'badge-level') : ''; }

  function renderListItem(item, activeId){
    const active = item.id===activeId ? 'active' : '';
    const badges = [levelBadge(item.l), item.d?badge('Defining','badge-def'):'', item.r==='offensive'?badge('Strong language','badge-off'):'', item.p?badge(item.p):''].filter(Boolean).join('');
    return `<button class="word-item ${active}" data-id="${esc(item.id)}" type="button">
      <div class="word-top"><span class="word-title">${esc(item.w)}</span>${item.s?`<span class="word-ipa">${esc(item.s)}</span>`:''}</div>
      <div class="word-preview">${esc(item.g||'')}</div>
      <div class="badges">${badges}</div>
    </button>`;
  }

  function renderPager(pages, page){
    if(pages<=1) return '';
    let html = '<div class="pager" aria-label="Pagination">';
    html += `<button type="button" data-page="${page-1}" ${page===1?'disabled':''}>Prev</button>`;
    const window = 2;
    for(let i=1;i<=pages;i++){
      if(i===1||i===pages||Math.abs(i-page)<=window){
        html += `<button type="button" data-page="${i}" class="${i===page?'active':''}" ${i===page?'aria-current="page"':''}>${i}</button>`;
      } else if(Math.abs(i-page)===window+1){
        html += `<span aria-hidden="true">…</span>`;
      }
    }
    html += `<button type="button" data-page="${page+1}" ${page===pages?'disabled':''}>Next</button></div>`;
    return html;
  }

  function renderEntry(entry){
    if(!entry) return `<div class="detail-empty"><h3>No entry selected</h3><p>Choose a word from the list to see its definitions, pronunciation, and grammar labels.</p></div>`;
    const senses = (entry.senses||[]).map((s,si)=>{
      const defs = (s.defs||[]).map(d=>{
        const labels = (d.labels||[]).length ? `<div class="def-labels">${d.labels.map(l=>`<span class="label-chip">${esc(l)}</span>`).join('')}</div>` : '';
        return `<li class="def-item"><div class="def-text">${esc(d.text)}</div>${d.example?`<div class="def-example">Example: ${esc(d.example)}</div>`:''}${labels}</li>`;
      }).join('');
      const syn = (s.synonyms||[]).length ? `<div class="meta-box"><h4>Synonyms</h4><p>${s.synonyms.map(esc).join(', ')}</p></div>` : '';
      const ant = (s.antonyms||[]).length ? `<div class="meta-box"><h4>Antonyms</h4><p>${s.antonyms.map(esc).join(', ')}</p></div>` : '';
      const note = s.note ? `<div class="note">${esc(s.note)}</div>` : '';
      const gram = s.grammar ? `<span class="sense-gram">${esc(s.grammar)}</span>` : '';
      return `<section class="sense" aria-labelledby="sense-${si}">
        <div class="sense-head"><span id="sense-${si}" class="sense-pos">${esc(s.pos||entry.pos||'')}</span>${levelBadge(s.level||entry.level)}${gram}${s.register && s.register!=='neutral'?badge(s.register):''}</div>
        <ol class="def-list">${defs}</ol>
        ${(syn||ant)?`<div class="meta-grid" style="margin-top:.8rem">${syn}${ant}</div>`:''}
        ${note}
      </section>`;
    }).join('');

    const variants = (entry.variants||[]).length ? `<div class="meta-box"><h4>Variants</h4><p>${entry.variants.map(esc).join(', ')}</p></div>` : '';
    const tags = (entry.tags||[]).length ? `<div class="meta-box"><h4>Tags</h4><p>${entry.tags.map(esc).join(', ')}</p></div>` : '';
    const region = entry.region ? `<div class="meta-box"><h4>Region</h4><p>${esc(entry.region)}</p></div>` : '';
    const usage = entry.note ? `<div class="note">${esc(entry.note)}</div>` : '';
    const warning = entry.warning ? `<div class="warning"><strong>Warning:</strong> ${esc(entry.warning)}</div>` : '';
    const extras = [];
    if(entry.verb) extras.push(`<div class="meta-box"><h4>Verb / particle</h4><p>${esc(entry.verb)} + ${esc(entry.particle||'')}</p></div>`);
    if(entry.separable!=null) extras.push(`<div class="meta-box"><h4>Separable</h4><p>${entry.separable?'Yes, the object can come between the verb and particle.':'Usually not separable.'}</p></div>`);
    if(entry.stress) extras.push(`<div class="meta-box"><h4>Stress</h4><p>${esc(entry.stress)}</p></div>`);
    if(entry.severity) extras.push(`<div class="meta-box"><h4>Severity</h4><p>${esc(entry.severity)}</p></div>`);

    return `<article class="entry" aria-live="polite">
      <header class="entry-head">
        <h2 class="entry-word">${esc(entry.word)}</h2>
        <div class="entry-phon">
          ${entry.ipa_uk?`<span class="phon-item"><span class="phon-label">UK IPA</span> <span class="ipa">${esc(entry.ipa_uk)}</span></span>`:''}
          ${entry.ipa_us?`<span class="phon-item"><span class="phon-label">US IPA</span> <span class="ipa">${esc(entry.ipa_us)}</span></span>`:''}
          ${!entry.ipa_uk && !entry.ipa_us ? `<span class="phon-item"><span class="phon-label">IPA</span> <span>Not available</span></span>`:''}
        </div>
        <div class="badges">${levelBadge(entry.level)}${badge(entry.pos||'entry')}${entry.defining?badge('Defining vocabulary','badge-def'):''}${entry.register && entry.register!=='neutral'?badge(entry.register, entry.register==='offensive'?'badge-off':''):''}</div>
        <p class="entry-def">${esc(entry.senses?.[0]?.defs?.[0]?.text || '')}</p>
      </header>
      ${warning}
      ${senses}
      ${(variants||tags||region||extras.length)?`<div class="meta-grid">${variants}${tags}${region}${extras.join('')}</div>`:''}
      ${usage}
      <div class="meta-grid">
        <div class="meta-box"><h4>Sources</h4><p>${(entry.source||[]).map(esc).join('; ')}</p></div>
      </div>
    </article>`;
  }

  async function renderLexiconPanel(tab){
    const panel = $(`#panel-${tab}`);
    const info = TAB_INFO[tab];
    const {items,total,pages,page,start} = paginate(state.filtered);
    panel.innerHTML = `
      <div class="section-head">
        <div>
          <h2>${esc(info.title)}</h2>
          <p>${esc(info.desc)}</p>
        </div>
        <div class="result-meta">${total.toLocaleString()} result${total===1?'':'s'}${state.query?` for “${esc(state.query)}”`:''}</div>
      </div>
      <div class="layout">
        <div class="card list-pane" aria-label="Results list">
          <div class="list" id="list-${tab}">
            ${items.length ? items.map(it=>renderListItem(it,state.selectedId)).join('') : `<div class="empty"><h3>No matches found</h3><p>Try a different spelling, remove filters, or use wildcards like <code>*</code> and <code>?</code>.</p></div>`}
          </div>
          ${renderPager(pages,page)}
        </div>
        <div class="card detail-pane" id="detail-${tab}"><div class="detail-empty"><h3>Loading entry…</h3><p>Fetching dictionary data.</p></div></div>
      </div>`;

    const detail = $(`#detail-${tab}`);
    if(state.selectedId){
      const entry = await getEntry(state.selectedId);
      detail.innerHTML = renderEntry(entry);
    } else {
      detail.innerHTML = `<div class="detail-empty"><h3>No entry selected</h3><p>Select a word to view details.</p></div>`;
    }

    // events
    $$('.word-item', panel).forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        state.selectedId = btn.dataset.id;
        $$('.word-item', panel).forEach(b=>b.classList.toggle('active', b===btn));
        detail.innerHTML = `<div class="detail-empty"><h3>Loading…</h3></div>`;
        const entry = await getEntry(state.selectedId);
        detail.innerHTML = renderEntry(entry);
        if(window.matchMedia('(max-width:759px)').matches) detail.scrollIntoView({behavior:'smooth',block:'start'});
      });
    });
    $$('.pager button[data-page]', panel).forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const p = Number(btn.dataset.page);
        if(!p || p===state.page) return;
        state.page = p;
        renderLexiconPanel(tab);
        panel.scrollIntoView({behavior:'smooth',block:'start'});
      });
    });
  }

  async function ensureRef(name){
    if(state.ref[name]) return state.ref[name];
    const data = await getJSON(`${DATA}/${name}`);
    state.ref[name]=data;
    return data;
  }

  function renderTable(headers, rows){
    return `<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  function renderNumbers(data){
    const sections = data.numberSections || [];
    const unitSections = data.unitSections || [];
    const conv = data.conversions || {};
    const catOptions = Object.keys(conv).map(k=>`<option value="${esc(k)}">${esc(k.charAt(0).toUpperCase()+k.slice(1))}</option>`).join('');
    return `
      <div class="section-head"><div><h2>Numbers & Units</h2><p>${esc(data.intro||'')}</p></div></div>
      <div class="ref-layout">
        <div class="card converter">
          <h3 style="margin:0;font-family:var(--font-display);color:#193a32">Unit converter</h3>
          <p style="margin:0;color:var(--muted)">Convert common units. Temperature uses offset formulas; other categories use linear factors.</p>
          <div class="converter-grid">
            <label class="control"><span>Category</span><select id="convCat">${catOptions}</select></label>
            <label class="control"><span>Value</span><input id="convVal" type="number" step="any" value="1"></label>
            <label class="control"><span>From</span><select id="convFrom"></select></label>
            <label class="control"><span>To</span><select id="convTo"></select></label>
          </div>
          <div class="converter-result" id="convResult">1</div>
        </div>
        ${sections.map(sec=>`
          <section class="card ref-section">
            <h3>${esc(sec.title)}</h3>
            <p>${esc(sec.intro||'')}</p>
            ${renderTable(['Term','Symbol','IPA','Meaning','Example'], (sec.entries||[]).map(e=>[
              `<strong>${esc(e.word)}</strong>`, esc(e.symbol||''), `<span class="ipa">${esc(e.ipa||'')}</span>`, esc(e.explanation||''), esc(e.example||'')
            ]))}
          </section>`).join('')}
        ${unitSections.map(sec=>`
          <section class="card ref-section">
            <h3>${esc(sec.title)}</h3>
            <p>${esc(sec.intro||'')}</p>
            ${renderTable(['Name','Symbol','Quantity','Definition','Relation','Example'], (sec.entries||[]).map(e=>[
              `<strong>${esc(e.name)}</strong>`, esc(e.symbol||''), esc(e.quantity||''), esc(e.definition||''), esc(e.relation||''), esc(e.example||'')
            ]))}
          </section>`).join('')}
        <section class="card ref-section"><h3>Useful number phrases</h3><div class="ref-cards">${(data.phrases||[]).map(p=>`<div class="ref-card"><h4>${esc(p.phrase)}</h4><p><strong>Meaning:</strong> ${esc(p.meaning)}</p><p><em>${esc(p.example)}</em></p></div>`).join('')}</div></section>
      </div>`;
  }

  function wireConverter(data){
    const conv = data.conversions||{};
    const cat=$('#convCat'), from=$('#convFrom'), to=$('#convTo'), val=$('#convVal'), out=$('#convResult');
    if(!cat) return;
    function fillUnits(){
      const c=conv[cat.value]; if(!c) return;
      const opts=c.units.map(u=>`<option value="${esc(u.symbol)}">${esc(u.name)} (${esc(u.symbol)})</option>`).join('');
      from.innerHTML=opts; to.innerHTML=opts; if(c.units[1]) to.selectedIndex=1;
      calc();
    }
    function calc(){
      const c=conv[cat.value]; if(!c) return;
      const v=parseFloat(val.value);
      if(Number.isNaN(v)){ out.textContent='Enter a number'; return; }
      const fs=from.value, ts=to.value;
      let result;
      if(cat.value==='temperature'){
        // convert to Celsius then to target
        let celsius=v;
        if(fs==='°F') celsius=(v-32)*5/9;
        if(fs==='K') celsius=v-273.15;
        result=celsius;
        if(ts==='°F') result=(celsius*9/5)+32;
        if(ts==='K') result=celsius+273.15;
      } else {
        const fu=c.units.find(u=>u.symbol===fs); const tu=c.units.find(u=>u.symbol===ts);
        if(!fu||!tu){ out.textContent='—'; return; }
        result = v * fu.factor / tu.factor;
      }
      const pretty = Math.abs(result) >= 1e6 || (Math.abs(result) > 0 && Math.abs(result) < 0.001) ? result.toExponential(6) : Number(result.toFixed(8)).toString();
      out.textContent = `${v} ${fs} = ${pretty} ${ts}`;
    }
    cat.addEventListener('change', fillUnits);
    [from,to,val].forEach(x=>x.addEventListener('input', calc));
    fillUnits();
  }

  function renderPronunciation(data){
    return `
      <div class="section-head"><div><h2>Pronunciation Guide</h2><p>${esc(data.intro||'')}</p></div></div>
      <div class="ref-layout">
        <section class="card ref-section"><h3>Monophthongs</h3>${renderTable(['Symbol','Type','Example','IPA','Common spellings','Description'], (data.vowels||[]).map(v=>[`<span class="ipa">${esc(v.symbol)}</span>`,esc(v.type||''),esc(v.example||''),`<span class="ipa">${esc(v.ipa||'')}</span>`,esc(v.spelling||''),esc(v.description||'')]))}</section>
        <section class="card ref-section"><h3>Diphthongs</h3>${renderTable(['Symbol','Type','Example','IPA','Common spellings','Description'], (data.diphthongs||[]).map(v=>[`<span class="ipa">${esc(v.symbol)}</span>`,esc(v.type||''),esc(v.example||''),`<span class="ipa">${esc(v.ipa||'')}</span>`,esc(v.spelling||''),esc(v.description||'')]))}</section>
        <section class="card ref-section"><h3>Consonants</h3>${renderTable(['Symbol','Type','Example','IPA','Common spellings','Description'], (data.consonants||[]).map(v=>[`<span class="ipa">${esc(v.symbol)}</span>`,esc(v.type||''),esc(v.example||''),`<span class="ipa">${esc(v.ipa||'')}</span>`,esc(v.spelling||''),esc(v.description||'')]))}</section>
        <section class="card ref-section"><h3>Stress and rhythm</h3><p>${esc(data.stress?.summary||'')}</p><div class="ref-cards">${(data.stress?.rules||[]).map(r=>`<div class="ref-card"><h4>${esc(r.title)}</h4><p>${esc(r.text)}</p></div>`).join('')}</div>${renderTable(['Word','IPA','Note'], (data.stress?.examples||[]).map(e=>[esc(e.word),`<span class="ipa">${esc(e.ipa)}</span>`,esc(e.note)]))}</section>
        <section class="card ref-section"><h3>Connected speech</h3><div class="ref-cards">${(data.connectedSpeech||[]).map(r=>`<div class="ref-card"><h4>${esc(r.title)}</h4><p>${esc(r.text)}</p><p><span class="ipa">${esc(r.example||'')}</span></p></div>`).join('')}</div></section>
        <section class="card ref-section"><h3>UK / US differences</h3>${renderTable(['Feature','UK','US','Examples'], (data.ukUs||[]).map(r=>[esc(r.feature),esc(r.uk),esc(r.us),esc((r.examples||[]).join('; '))]))}</section>
        <section class="card ref-section"><h3>Minimal pairs</h3>${renderTable(['Pair','IPA','Note'], (data.minimalPairs||[]).map(r=>[esc((r.pair||[]).join(' / ')),`<span class="ipa">${esc((r.ipa||[]).join(' / '))}</span>`,esc(r.note||'')]))}</section>
      </div>`;
  }

  function renderGrammar(data){
    return `
      <div class="section-head"><div><h2>Grammar Codes</h2><p>${esc(data.intro||'')}</p></div></div>
      <div class="ref-layout">
        <section class="card ref-section"><h3>Word classes</h3>${renderTable(['Code','Word class','Summary','Examples','Notes'], (data.wordClasses||[]).map(w=>[`<strong>${esc(w.code)}</strong>`,esc(w.name),esc(w.summary),esc((w.examples||[]).join(', ')),esc(w.notes||'')]))}</section>
        <section class="card ref-section"><h3>Grammar codes used in entries</h3>${renderTable(['Code','Meaning','Example'], (data.grammarCodes||[]).map(g=>[`<strong>${esc(g.code)}</strong>`,esc(g.meaning),esc(g.example)]))}</section>
        ${(data.sections||[]).map(sec=>`<section class="card ref-section"><h3>${esc(sec.title)}</h3>${(sec.body||[]).map(p=>`<p>${esc(p)}</p>`).join('')}${sec.examples?`<div class="ref-cards">${sec.examples.map(ex=>`<div class="ref-card"><h4>Example</h4><p>${esc(ex.text)}</p>${ex.note?`<p><em>${esc(ex.note)}</em></p>`:''}</div>`).join('')}</div>`:''}</section>`).join('')}
      </div>`;
  }

  async function renderReferencePanel(tab){
    const panel = $(`#panel-${tab}`);
    const info = TAB_INFO[tab];
    panel.innerHTML = `<div class="detail-empty"><h3>Loading ${esc(info.title)}…</h3></div>`;
    try {
      const data = await ensureRef(info.ref);
      if(tab==='numbers') { panel.innerHTML = renderNumbers(data); wireConverter(data); }
      else if(tab==='pronunciation') panel.innerHTML = renderPronunciation(data);
      else if(tab==='grammar') panel.innerHTML = renderGrammar(data);
    } catch(err){
      console.error(err);
      panel.innerHTML = `<div class="empty"><h3>Could not load this section</h3><p>${esc(err.message)}</p></div>`;
    }
  }

  async function renderCurrentTab(){
    const info = TAB_INFO[state.tab];
    if(info.type==='lexicon') { applyFilters(); await renderLexiconPanel(state.tab); }
    else await renderReferencePanel(state.tab);
  }

  function switchTab(tab){
    if(!TAB_INFO[tab] || state.tab===tab) return;
    state.tab = tab;
    el.tabs.forEach(t=>{
      const on = t.dataset.tab===tab;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', on ? 'true':'false');
      t.tabIndex = on ? 0 : -1;
    });
    el.panels.forEach(p=>{
      const on = p.dataset.panel===tab;
      p.hidden = !on;
      p.classList.toggle('active', on);
    });
    history.replaceState(null,'',`#${tab}`);
    renderCurrentTab().catch(err=>{ console.error(err); toast('Error loading section'); });
  }

  function bindEvents(){
    el.tabs.forEach(t=>t.addEventListener('click', ()=>switchTab(t.dataset.tab)));
    el.tabs.forEach(t=>t.addEventListener('keydown', e=>{
      if(!['ArrowRight','ArrowLeft','Home','End'].includes(e.key)) return;
      e.preventDefault();
      const idx = el.tabs.indexOf(t);
      let next = idx;
      if(e.key==='ArrowRight') next=(idx+1)%el.tabs.length;
      if(e.key==='ArrowLeft') next=(idx-1+el.tabs.length)%el.tabs.length;
      if(e.key==='Home') next=0;
      if(e.key==='End') next=el.tabs.length-1;
      el.tabs[next].focus(); switchTab(el.tabs[next].dataset.tab);
    }));

    const onSearch = debounce(()=>{ state.query = el.searchInput.value; el.clearSearch.hidden = !state.query; if(TAB_INFO[state.tab].type==='lexicon') renderCurrentTab(); }, 180);
    el.searchInput.addEventListener('input', onSearch);
    el.searchInput.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); state.query=el.searchInput.value; el.clearSearch.hidden=!state.query; if(TAB_INFO[state.tab].type!=='lexicon') switchTab('dictionary'); else renderCurrentTab(); }});
    el.searchBtn.addEventListener('click', ()=>{ state.query=el.searchInput.value; el.clearSearch.hidden=!state.query; if(TAB_INFO[state.tab].type!=='lexicon') switchTab('dictionary'); else renderCurrentTab(); });
    el.clearSearch.addEventListener('click', ()=>{ el.searchInput.value=''; state.query=''; el.clearSearch.hidden=true; if(TAB_INFO[state.tab].type==='lexicon') renderCurrentTab(); el.searchInput.focus(); });
    el.sortSelect.addEventListener('change', ()=>{ state.sort=el.sortSelect.value; if(TAB_INFO[state.tab].type==='lexicon') renderCurrentTab(); });
    el.densitySelect.addEventListener('change', ()=>{ state.density=el.densitySelect.value; document.body.classList.toggle('compact', state.density==='compact'); });
  }

  async function init(){
    bindEvents();
    try {
      [state.meta, state.search, state.chunks] = await Promise.all([
        getJSON(`${DATA}/meta.json`),
        getJSON(`${DATA}/search.json`),
        getJSON(`${DATA}/chunks.json`),
      ]);
      state.search.forEach(it=>state.idToIndex.set(it.id, it.i));
      setStats();
      const hash = location.hash.replace('#','');
      if(TAB_INFO[hash]) state.tab = hash;
      // sync tab UI
      el.tabs.forEach(t=>{ const on=t.dataset.tab===state.tab; t.classList.toggle('active',on); t.setAttribute('aria-selected', on?'true':'false'); });
      el.panels.forEach(p=>{ const on=p.dataset.panel===state.tab; p.hidden=!on; p.classList.toggle('active',on); });
      await renderCurrentTab();
    } catch(err){
      console.error(err);
      $('#panel-dictionary').innerHTML = `<div class="empty"><h3>Failed to load dictionary data</h3><p>${esc(err.message)}</p><p>Make sure the <code>data/</code> folder is present next to <code>index.html</code>.</p></div>`;
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
