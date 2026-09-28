// Ducor International Pharmacy — Shared Widgets
// 1. Global Search (Ctrl+K)
// 2. AI Chat Assistant (24/7)

(function() {
'use strict';

// ══════════════════════════════════════════
//  PRODUCT CATALOG (from shop.js → window.DUCOR_PRODUCTS)
// ══════════════════════════════════════════
const SEARCH_ALIASES = {
  tylenol: 'acetaminophen',
  paracetamol: 'acetaminophen',
  advil: 'ibuprofen',
  motrin: 'ibuprofen',
  aleve: 'naproxen',
  prilosec: 'omeprazole',
  nexium: 'esomeprazole',
  claritin: 'loratadine',
  zyrtec: 'cetirizine',
  allegra: 'fexofenadine',
  benadryl: 'diphenhydramine',
  'ascorbic acid': 'vitamin c',
  ascorbic: 'vitamin c',
  tums: 'calcium carbonate',
  pepto: 'bismuth',
  afrin: 'oxymetazoline',
  'fish oil': 'omega',
  prenatals: 'prenatal',
  'vitamin c': 'vitamin c'
};

function flattenCatalog(catalog) {
  if (!catalog) return [];
  if (Array.isArray(catalog)) return catalog.filter(function (p) { return p && p.name && !p.adminOnly; });
  return Object.entries(catalog).flatMap(function (entry) {
    var category = entry[0];
    var items = entry[1] || [];
    return items.filter(function (p) { return p && !p.adminOnly; }).map(function (p) {
      return { id: p.id, name: p.name, price: p.price, category: p.category || category };
    });
  });
}

function getProducts() {
  if (Array.isArray(window.DUCOR_PRODUCTS) && window.DUCOR_PRODUCTS.length) {
    return window.DUCOR_PRODUCTS;
  }
  if (window.PRODUCTS && typeof window.PRODUCTS === 'object') {
    return flattenCatalog(window.PRODUCTS);
  }
  // Classic script top-level const PRODUCTS (shop.js) is lexical-global, not on window
  try {
    if (typeof PRODUCTS !== 'undefined' && PRODUCTS) {
      return flattenCatalog(PRODUCTS);
    }
  } catch (e) { /* ignore */ }
  return [];
}

var _shopCatalogPromise = null;
function ensureProductCatalog() {
  var existing = getProducts();
  if (existing.length) return Promise.resolve(existing);
  if (_shopCatalogPromise) return _shopCatalogPromise;
  _shopCatalogPromise = new Promise(function (resolve) {
    // Avoid double-inserting if shop.js is already a script tag but not finished
    var existingScript = document.querySelector('script[src*="shop.js"]');
    function finish() {
      resolve(getProducts());
    }
    if (existingScript) {
      // shop.js may still be parsing; poll briefly
      var tries = 0;
      var t = setInterval(function () {
        tries++;
        if (getProducts().length || tries > 40) {
          clearInterval(t);
          finish();
        }
      }, 50);
      return;
    }
    var s = document.createElement('script');
    s.src = '/assets/shop.js';
    s.async = true;
    s.onload = finish;
    s.onerror = function () { resolve([]); };
    document.head.appendChild(s);
  });
  return _shopCatalogPromise;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function expandSearchTerms(q) {
  var raw = q.toLowerCase().trim();
  var terms = new Set([raw]);
  Object.keys(SEARCH_ALIASES).forEach(function (alias) {
    if (raw === alias || raw.includes(alias) || alias.includes(raw)) {
      terms.add(SEARCH_ALIASES[alias]);
      terms.add(alias);
    }
  });
  return { raw: raw, terms: Array.from(terms), words: raw.split(/\s+/).filter(Boolean) };
}

function productMatchesQuery(p, expanded) {
  var name = (p.name || '').toLowerCase();
  var cat = (p.category || '').toLowerCase();
  if (!name) return false;
  // Full query substring (handles "vitamin c", "ibuprofen 200", etc.)
  if (expanded.raw && (name.includes(expanded.raw) || cat.includes(expanded.raw))) return true;
  // Multi-word: every significant token (≥2 chars) must appear
  var significant = expanded.words.filter(function (w) { return w.length >= 2; });
  if (significant.length > 1 && significant.every(function (w) { return name.includes(w); })) {
    return true;
  }
  for (var i = 0; i < expanded.terms.length; i++) {
    var t = expanded.terms[i];
    if (t && t.length >= 2 && (name.includes(t) || cat.includes(t))) return true;
  }
  return false;
}

function scoreProduct(p, expanded) {
  var name = (p.name || '').toLowerCase();
  var score = 0;
  if (name === expanded.raw) score += 100;
  if (name.startsWith(expanded.raw)) score += 40;
  if (name.includes(expanded.raw)) score += 20;
  expanded.terms.forEach(function (t) {
    if (t !== expanded.raw && name.includes(t)) score += 10;
  });
  // Prefer shorter / closer names
  score -= Math.min(name.length, 40) * 0.05;
  return score;
}

function productHref(p) {
  var cat = p.category || 'otc';
  return '/product.html?id=' + encodeURIComponent(p.id) + '&cat=' + encodeURIComponent(cat);
}

// ══════════════════════════════════════════
//  1. GLOBAL SEARCH
// ══════════════════════════════════════════
function initSearch() {
  // Inject CSS
  const style = document.createElement('style');
  style.textContent = `
    #ducor-search-overlay{position:fixed;inset:0;background:rgba(2,12,27,0.82);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding-top:80px;opacity:0;pointer-events:none;transition:opacity .2s;backdrop-filter:blur(6px)}
    #ducor-search-overlay.open{opacity:1;pointer-events:all}
    #ducor-search-box{background:#0a1929;border:1.5px solid rgba(201,160,85,0.35);border-radius:18px;width:100%;max-width:620px;overflow:hidden;box-shadow:0 32px 80px rgba(0,0,0,0.6);transform:translateY(-16px);transition:transform .2s}
    #ducor-search-overlay.open #ducor-search-box{transform:translateY(0)}
    #ducor-search-input-wrap{display:flex;align-items:center;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.08);gap:12px}
    #ducor-search-input-wrap svg{color:rgba(201,160,85,0.7);flex-shrink:0}
    #ducor-search-q{flex:1;background:none;border:none;outline:none;font-size:1.05rem;color:#fff;font-family:inherit}
    #ducor-search-q::placeholder{color:rgba(255,255,255,0.3)}
    #ducor-search-results{max-height:420px;overflow-y:auto}
    .ducor-sr-item{display:flex;align-items:center;gap:14px;padding:13px 20px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.05);text-decoration:none;transition:background .15s}
    .ducor-sr-item:hover{background:rgba(201,160,85,0.08)}
    .ducor-sr-badge{font-size:10px;font-weight:700;padding:2px 8px;border-radius:50px;text-transform:uppercase;letter-spacing:.5px;flex-shrink:0}
    .ducor-sr-badge.rx{background:rgba(220,38,38,0.15);color:#dc2626}
    .ducor-sr-badge.otc{background:rgba(16,185,129,0.15);color:#059669}
    .ducor-sr-badge.vitamins{background:rgba(139,92,246,0.15);color:#7c3aed}
    .ducor-sr-name{flex:1;color:#fff;font-size:0.9rem;font-weight:600}
    .ducor-sr-price{color:rgba(201,160,85,0.9);font-weight:700;font-size:0.9rem;flex-shrink:0}
    #ducor-search-empty{padding:40px 20px;text-align:center;color:rgba(255,255,255,0.3);font-size:0.9rem}
    #ducor-search-hint{padding:10px 20px;font-size:11px;color:rgba(255,255,255,0.2);display:flex;justify-content:space-between}
    #ducor-search-btn{background:none;border:none;cursor:pointer;padding:6px;border-radius:8px;color:rgba(255,255,255,0.5);transition:color .2s;display:flex;align-items:center;gap:5px}
    #ducor-search-btn:hover{color:rgba(201,160,85,0.9)}
    #ducor-search-btn-label{font-size:11px;font-weight:600;letter-spacing:.5px}
  `;
  document.head.appendChild(style);

  // Inject HTML
  const overlay = document.createElement('div');
  overlay.id = 'ducor-search-overlay';
  overlay.innerHTML = `
    <div id="ducor-search-box">
      <div id="ducor-search-input-wrap">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input id="ducor-search-q" type="text" placeholder="Search 248 medications, vitamins, supplements…" autocomplete="off"/>
        <kbd style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:5px;padding:3px 7px;font-size:11px;color:rgba(255,255,255,0.4);font-family:inherit">ESC</kbd>
      </div>
      <div id="ducor-search-results"></div>
      <div id="ducor-search-hint"><span>↑↓ Navigate</span><span>↵ Open product</span><span>ESC Close</span></div>
    </div>`;
  document.body.appendChild(overlay);

  // Add search button to nav
  const navLinks = document.querySelector('.nav-links');
  if (navLinks) {
    const btn = document.createElement('button');
    btn.id = 'ducor-search-btn';
    btn.setAttribute('aria-label', 'Search medications');
    btn.innerHTML = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg><span id="ducor-search-btn-label">Search</span>`;
    btn.onclick = openSearch;
    navLinks.insertBefore(btn, navLinks.querySelector('.nav-cta') || navLinks.firstChild);
  }

  let selectedIdx = -1;

  function openSearch() {
    overlay.classList.add('open');
    document.getElementById('ducor-search-q').focus();
    selectedIdx = -1;
    ensureProductCatalog(); // warm catalog (needed on homepage)
    renderResults(document.getElementById('ducor-search-q').value || '');
  }

  function closeSearch() {
    overlay.classList.remove('open');
    document.getElementById('ducor-search-q').value = '';
  }

  function renderResults(q) {
    const container = document.getElementById('ducor-search-results');
    if (!q.trim()) {
      container.innerHTML = `<div id="ducor-search-empty">Start typing to search medications, vitamins &amp; supplements…</div>`;
      return;
    }

    function paint(allProducts) {
      if (!allProducts.length) {
        container.innerHTML = `<div id="ducor-search-empty">Catalog is still loading… try again in a moment.</div>`;
        ensureProductCatalog().then(function (loaded) {
          if (document.getElementById('ducor-search-q').value.trim() === q.trim()) {
            paint(loaded);
          }
        });
        return;
      }
      const expanded = expandSearchTerms(q);
      const results = allProducts
        .filter(function (p) { return productMatchesQuery(p, expanded); })
        .sort(function (a, b) { return scoreProduct(b, expanded) - scoreProduct(a, expanded); })
        .slice(0, 12);

      if (!results.length) {
        container.innerHTML = `<div id="ducor-search-empty">No results for "<strong style="color:#fff">${escapeHtml(q)}</strong>". Try a different name or category.</div>`;
        return;
      }
      container.innerHTML = results.map(function (p, i) {
        var badge = p.category === 'prescription' ? 'RX' : p.category === 'otc' ? 'OTC' : 'VIT';
        var badgeClass = p.category === 'prescription' ? 'rx' : (p.category || 'otc');
        var priceHtml = p.category === 'prescription'
          ? ''
          : `<span class="ducor-sr-price">$${(Number(p.price) || 0).toFixed(2)}</span>`;
        return `<a class="ducor-sr-item" href="${productHref(p)}" data-idx="${i}">
        <span class="ducor-sr-badge ${badgeClass}">${badge}</span>
        <span class="ducor-sr-name">${escapeHtml(p.name)}</span>
        ${priceHtml}
      </a>`;
      }).join('');
      selectedIdx = -1;
    }

    paint(getProducts());
  }

  document.getElementById('ducor-search-q').addEventListener('input', e => renderResults(e.target.value));
  document.getElementById('ducor-search-q').addEventListener('keydown', e => {
    const items = document.querySelectorAll('.ducor-sr-item');
    if (e.key === 'ArrowDown') { e.preventDefault(); selectedIdx = Math.min(selectedIdx+1, items.length-1); items.forEach((el,i) => el.style.background = i===selectedIdx ? 'rgba(201,160,85,0.12)' : ''); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); selectedIdx = Math.max(selectedIdx-1, -1); items.forEach((el,i) => el.style.background = i===selectedIdx ? 'rgba(201,160,85,0.12)' : ''); }
    if (e.key === 'Enter' && items.length) {
      e.preventDefault();
      const idx = selectedIdx >= 0 ? selectedIdx : 0;
      if (items[idx]) { items[idx].click(); closeSearch(); }
    }
    if (e.key === 'Escape') closeSearch();
  });
  overlay.addEventListener('click', e => { if (e.target === overlay) closeSearch(); });
  document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openSearch(); } });
}

// ══════════════════════════════════════════
//  2. AI CHAT WIDGET (+ human pharmacist handoff)
// ══════════════════════════════════════════
function initChat() {
  const style = document.createElement('style');
  style.textContent = `
    #ducor-chat-btn{position:fixed;bottom:28px;right:28px;z-index:9000;width:60px;height:60px;border-radius:50%;background:linear-gradient(145deg,#0a2558 0%,#0d3a6e 45%,#0d9488 100%);border:2px solid rgba(201,160,85,0.45);cursor:pointer;box-shadow:0 8px 28px rgba(10,37,88,0.5),0 0 0 1px rgba(201,160,85,0.12);display:flex;align-items:center;justify-content:center;transition:transform .2s,box-shadow .2s}
    #ducor-chat-btn:hover{transform:scale(1.06);box-shadow:0 12px 36px rgba(10,37,88,0.55),0 0 0 2px rgba(201,160,85,0.35)}
    #ducor-chat-btn:focus-visible{outline:2px solid #c9a055;outline-offset:3px}
    #ducor-chat-badge{position:absolute;top:-3px;right:-3px;width:18px;height:18px;background:#dc2626;border-radius:50%;border:2px solid #fff;font-size:10px;font-weight:700;color:#fff;display:flex;align-items:center;justify-content:center}
    #ducor-chat-window{position:fixed;bottom:100px;right:28px;z-index:9000;width:380px;max-height:min(640px,calc(100vh - 120px));background:#071422;border:1.5px solid rgba(201,160,85,0.35);border-radius:18px;box-shadow:0 28px 64px rgba(0,0,0,0.55),0 0 0 1px rgba(13,148,136,0.08);display:flex;flex-direction:column;opacity:0;pointer-events:none;transform:translateY(16px) scale(0.97);transition:opacity .25s,transform .25s;overflow:hidden;font-family:Inter,system-ui,-apple-system,sans-serif}
    #ducor-chat-window.open{opacity:1;pointer-events:all;transform:translateY(0) scale(1)}
    @media(max-width:440px){#ducor-chat-window{right:8px;left:8px;width:auto;bottom:90px;max-height:calc(100vh - 110px);border-radius:16px}}
    #ducor-chat-head{background:linear-gradient(135deg,#061530 0%,#0a2558 55%,#0b3d4a 100%);padding:14px 14px 14px 16px;display:flex;align-items:center;gap:12px;border-bottom:1px solid rgba(201,160,85,0.22);flex-shrink:0}
    #ducor-chat-head-avatar{width:40px;height:40px;border-radius:50%;background:linear-gradient(145deg,rgba(201,160,85,0.35),rgba(13,148,136,0.28));border:1.5px solid rgba(201,160,85,0.55);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;box-shadow:inset 0 1px 0 rgba(255,255,255,0.12)}
    #ducor-chat-head-info{flex:1;min-width:0}
    #ducor-chat-head-info h4{color:#fff;font-size:0.88rem;font-weight:700;margin:0 0 3px;letter-spacing:.2px;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #ducor-chat-head-sub{display:flex;align-items:center;gap:7px;margin:0;color:rgba(255,255,255,0.72);font-size:0.72rem;font-weight:500;line-height:1.2}
    #ducor-chat-status{width:8px;height:8px;background:#22c55e;border-radius:50%;animation:chatPulse 2s infinite;flex-shrink:0;box-shadow:0 0 0 3px rgba(34,197,94,0.18)}
    #ducor-chat-status.human{background:#c9a055;animation:none;box-shadow:0 0 0 3px rgba(201,160,85,0.25)}
    #ducor-chat-status.waiting{background:#f59e0b;animation:chatPulse 1.2s infinite;box-shadow:0 0 0 3px rgba(245,158,11,0.22)}
    @keyframes chatPulse{0%,100%{opacity:1}50%{opacity:.45}}
    #ducor-chat-close{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);cursor:pointer;color:rgba(255,255,255,0.55);padding:6px;border-radius:8px;transition:color .15s,background .15s,border-color .15s;flex-shrink:0;display:flex;align-items:center;justify-content:center}
    #ducor-chat-close:hover{color:#fff;background:rgba(255,255,255,0.12);border-color:rgba(201,160,85,0.35)}
    #ducor-chat-close:focus-visible{outline:2px solid #c9a055;outline-offset:2px}
    #ducor-chat-cta{padding:10px 12px;background:linear-gradient(180deg,rgba(13,148,136,0.12),rgba(7,20,34,0));border-bottom:1px solid rgba(255,255,255,0.06);flex-shrink:0}
    #ducor-chat-cta.hidden{display:none}
    #ducor-chat-pharmacist-btn{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:11px 14px;border:none;border-radius:11px;cursor:pointer;font-family:inherit;font-size:0.84rem;font-weight:700;letter-spacing:.2px;color:#071422;background:linear-gradient(135deg,#d4b06a 0%,#c9a055 45%,#a87830 100%);box-shadow:0 4px 14px rgba(201,160,85,0.35),inset 0 1px 0 rgba(255,255,255,0.25);transition:transform .15s,box-shadow .15s,filter .15s}
    #ducor-chat-pharmacist-btn:hover{filter:brightness(1.06);box-shadow:0 6px 18px rgba(201,160,85,0.45),inset 0 1px 0 rgba(255,255,255,0.28);transform:translateY(-1px)}
    #ducor-chat-pharmacist-btn:active{transform:translateY(0);filter:brightness(.98)}
    #ducor-chat-pharmacist-btn:focus-visible{outline:2px solid #5eead4;outline-offset:2px}
    #ducor-chat-pharmacist-btn svg{flex-shrink:0}
    #ducor-chat-messages{flex:1;overflow-y:auto;padding:14px 14px 8px;display:flex;flex-direction:column;gap:10px;min-height:180px;max-height:320px;scrollbar-width:thin;scrollbar-color:rgba(201,160,85,0.35) transparent}
    #ducor-chat-messages::-webkit-scrollbar{width:6px}
    #ducor-chat-messages::-webkit-scrollbar-thumb{background:rgba(201,160,85,0.35);border-radius:6px}
    .ducor-msg{max-width:86%;padding:10px 13px;border-radius:14px;font-size:0.84rem;line-height:1.55;word-wrap:break-word}
    .ducor-msg.bot{background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.92);align-self:flex-start;border-radius:4px 14px 14px 14px;border:1px solid rgba(255,255,255,0.06)}
    .ducor-msg.user{background:linear-gradient(135deg,#0a2558,#0d4a5c);color:#fff;align-self:flex-end;border-radius:14px 14px 4px 14px;border:1px solid rgba(201,160,85,0.28)}
    .ducor-msg.staff{background:rgba(201,160,85,0.16);color:#fff;align-self:flex-start;border-radius:4px 14px 14px 14px;border:1px solid rgba(201,160,85,0.4)}
    .ducor-msg.staff .ducor-msg-label{display:block;font-size:0.65rem;font-weight:700;color:#e0c080;letter-spacing:.45px;text-transform:uppercase;margin-bottom:4px}
    .ducor-msg.system{align-self:center;max-width:95%;background:rgba(13,148,136,0.1);color:rgba(255,255,255,0.72);font-size:0.75rem;text-align:center;border-radius:10px;border:1px dashed rgba(13,148,136,0.35);padding:8px 12px}
    .ducor-msg.bot a,.ducor-msg.staff a,.ducor-msg.system a{color:#e0c080;text-decoration:underline;text-underline-offset:2px}
    .ducor-msg.bot a:hover,.ducor-msg.staff a:hover,.ducor-msg.system a:hover{color:#c9a055}
    #ducor-chat-typing{display:none;align-self:flex-start;margin:0 14px 6px;background:rgba(255,255,255,0.08);padding:10px 14px;border-radius:4px 14px 14px 14px;border:1px solid rgba(255,255,255,0.06);gap:0;align-items:center}
    #ducor-chat-typing span{display:inline-block;width:6px;height:6px;background:rgba(201,160,85,0.75);border-radius:50%;margin:0 2px;animation:typingDot 1.2s infinite}
    #ducor-chat-typing span:nth-child(2){animation-delay:.2s}
    #ducor-chat-typing span:nth-child(3){animation-delay:.4s}
    @keyframes typingDot{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}
    #ducor-chat-handoff-bar{display:none;padding:9px 14px;background:rgba(201,160,85,0.12);border-top:1px solid rgba(201,160,85,0.28);font-size:0.74rem;color:#e0c080;font-weight:600;align-items:center;gap:8px;flex-shrink:0;line-height:1.35}
    #ducor-chat-handoff-bar.show{display:flex}
    #ducor-chat-handoff-bar::before{content:"";width:7px;height:7px;border-radius:50%;background:#c9a055;flex-shrink:0;box-shadow:0 0 0 3px rgba(201,160,85,0.2)}
    #ducor-chat-quick{padding:8px 12px 4px;display:flex;gap:6px;flex-wrap:wrap;flex-shrink:0}
    .ducor-quick-btn{background:rgba(255,255,255,0.05);border:1px solid rgba(201,160,85,0.28);color:rgba(224,192,128,0.95);font-size:0.72rem;font-weight:600;padding:6px 11px;border-radius:999px;cursor:pointer;transition:background .15s,border-color .15s,color .15s;font-family:inherit;line-height:1.2}
    .ducor-quick-btn:hover{background:rgba(201,160,85,0.16);border-color:rgba(201,160,85,0.45);color:#f0d9a8}
    .ducor-quick-btn:focus-visible{outline:2px solid #c9a055;outline-offset:2px}
    #ducor-chat-input-area{padding:10px 12px 12px;border-top:1px solid rgba(255,255,255,0.08);display:flex;gap:8px;align-items:flex-end;background:rgba(0,0,0,0.18);flex-shrink:0}
    #ducor-chat-input{flex:1;background:rgba(255,255,255,0.07);border:1.5px solid rgba(255,255,255,0.12);border-radius:12px;padding:11px 13px;font-size:0.84rem;color:#fff;font-family:inherit;outline:none;transition:border-color .2s,box-shadow .2s;resize:none;line-height:1.4;min-height:42px;max-height:96px}
    #ducor-chat-input:focus{border-color:rgba(201,160,85,0.55);box-shadow:0 0 0 3px rgba(201,160,85,0.12)}
    #ducor-chat-input::placeholder{color:rgba(255,255,255,0.38)}
    #ducor-chat-send{width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,#c9a055,#a87830);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity .2s,transform .15s,box-shadow .15s;box-shadow:0 3px 10px rgba(201,160,85,0.3)}
    #ducor-chat-send:hover{opacity:0.92;transform:translateY(-1px)}
    #ducor-chat-send:focus-visible{outline:2px solid #5eead4;outline-offset:2px}
  
  `;
  document.head.appendChild(style);

  const CONTACT_HTML = '<a href="https://wa.me/16309366050" target="_blank" rel="noopener">WhatsApp +1 (630) 936-6050</a> · <a href="https://wa.me/231880187490" target="_blank" rel="noopener">+231 880 187 490</a> · <a href="https://wa.me/231760801914" target="_blank" rel="noopener">+231 760 801 914</a>';
  const HOURS_MSG = 'Our pharmacists are available Monday–Saturday, 9AM–5PM (Monrovia time). Outside those hours I can keep helping as your online assistant, or you can reach the team anytime: ' + CONTACT_HTML + '.';
  // WhatsApp bridge (Lucas Lonestar +231778174157): handoff is allowed ANYTIME so
  // Lonestar can be notified and reply from WhatsApp even outside 9–5 for testing
  // and urgent cases. We still show the hours note to the client.
  const LONESTAR_BRIDGE_ENABLED = true;
  const FB_CONFIG = {
    apiKey: 'AIzaSyB2N6CcL0cGxBLfSdPANHJjjKuP5Rp0EIE',
    authDomain: 'ducor-pharmacy.firebaseapp.com',
    projectId: 'ducor-pharmacy',
    storageBucket: 'ducor-pharmacy.firebasestorage.app',
    messagingSenderId: '952933384266',
    appId: '1:952933384266:web:55b906e903d96940d426b3'
  };
  const SESSION_KEY = 'ducor-chat-session-id';
  const HUMAN_INTENT = /\b(talk to (a )?(pharmacist|human|person|agent|staff|someone)|speak (to|with) (a )?(pharmacist|human|person|agent|staff|someone)|real (person|pharmacist|human)|live (agent|chat|person|pharmacist|human)|human (please|help)|customer service|pharmacist please)\b/i;

  const btn = document.createElement('button');
  btn.id = 'ducor-chat-btn';
  btn.setAttribute('aria-label', 'Chat with Ducor International Pharmacy Customer Service');
  btn.innerHTML = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span id="ducor-chat-badge">1</span>`;

  const win = document.createElement('div');
  win.id = 'ducor-chat-window';
  win.innerHTML = `
    <div id="ducor-chat-head">
      <div id="ducor-chat-head-avatar" aria-hidden="true">💊</div>
      <div id="ducor-chat-head-info">
        <h4>Ducor International Pharmacy</h4>
        <p id="ducor-chat-head-sub"><span id="ducor-chat-status" aria-hidden="true"></span><span id="ducor-chat-head-sub-text">Online Assistant · Available 24/7</span></p>
      </div>
      <button id="ducor-chat-close" aria-label="Close chat" type="button">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div id="ducor-chat-cta">
      <button type="button" id="ducor-chat-pharmacist-btn" aria-label="Talk to a pharmacist">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="M16 11l2 2 4-4"/></svg>
        Talk to pharmacist
      </button>
    </div>
    <div id="ducor-chat-messages">
      <div class="ducor-msg bot">Welcome to Ducor International Pharmacy! 👋<br><br>I'm your online assistant, here 24/7 to guide you through everything — finding medications, placing an order, payment options, and more. How can I help you today?</div>
    </div>
    <div id="ducor-chat-typing"><span></span><span></span><span></span></div>
    <div id="ducor-chat-handoff-bar" role="status" aria-live="polite"></div>
    <div id="ducor-chat-quick">
      <button type="button" class="ducor-quick-btn" data-quick="What medications do you have?">Medications</button>
      <button type="button" class="ducor-quick-btn" data-quick="How do I place an order?">How to order</button>
      <button type="button" class="ducor-quick-btn" data-quick="Where are you located?">Location</button>
    </div>
    <div id="ducor-chat-input-area">
      <textarea id="ducor-chat-input" rows="1" placeholder="Ask me anything about medications…" aria-label="Chat message"></textarea>
      <button id="ducor-chat-send" aria-label="Send" type="button">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>`;

  document.body.appendChild(btn);
  document.body.appendChild(win);

  let chatOpen = false;
  let chatHistory = [];
  let handoffMode = false; // waiting | human
  let sessionId = null;
  let sessionStatus = 'ai';
  let fb = null; // { db, helpers }
  let unsubSession = null;
  let unsubMessages = null;
  const renderedMsgIds = new Set();

  btn.onclick = toggleChat;
  document.getElementById('ducor-chat-close').onclick = closeChat;
  document.getElementById('ducor-chat-send').onclick = sendMessage;
  document.getElementById('ducor-chat-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  document.getElementById('ducor-chat-pharmacist-btn').addEventListener('click', function () {
    requestHuman();
  });
  document.getElementById('ducor-chat-quick').addEventListener('click', e => {
    const b = e.target.closest('.ducor-quick-btn');
    if (!b) return;
    if (b.getAttribute('data-human')) {
      requestHuman();
      return;
    }
    const q = b.getAttribute('data-quick');
    if (q) ducorChatQuick(q);
  });

  function toggleChat() {
    chatOpen ? closeChat() : openChat();
  }
  function openChat() {
    chatOpen = true;
    win.classList.add('open');
    document.getElementById('ducor-chat-badge').style.display = 'none';
    setTimeout(() => document.getElementById('ducor-chat-input').focus(), 300);
  }
  function closeChat() {
    chatOpen = false;
    win.classList.remove('open');
  }

  window.ducorChatQuick = function(text) {
    if (!chatOpen) openChat();
    document.getElementById('ducor-chat-input').value = text;
    setTimeout(sendMessage, 100);
  };
  window.ducorRequestHuman = requestHuman;

  function formatMsgHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // restore safe links we inject ourselves (wa.me / tel / our domain)
      .replace(/&lt;a href="(https?:\/\/(?:wa\.me|www\.ducor-international-pharmacy\.com|ducor-international-pharmacy\.com)[^"]*)"(?: target="_blank")?(?: rel="noopener")?&gt;(.*?)&lt;\/a&gt;/g,
        '<a href="$1" target="_blank" rel="noopener">$2</a>');
  }

  function appendMsg(text, role, opts) {
    opts = opts || {};
    const msgs = document.getElementById('ducor-chat-messages');
    const div = document.createElement('div');
    div.className = 'ducor-msg ' + role;
    if (opts.id) {
      div.dataset.msgId = opts.id;
      renderedMsgIds.add(opts.id);
    }
    let html = formatMsgHtml(text);
    if (role === 'staff') {
      const label = opts.label || 'Pharmacist';
      html = '<span class="ducor-msg-label">' + label + '</span>' + html;
    }
    // Allow intentional HTML from our own CONTACT_HTML (trusted)
    if (opts.allowHtml) {
      div.innerHTML = text;
    } else {
      div.innerHTML = html;
    }
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  function showTyping() { document.getElementById('ducor-chat-typing').style.display = 'flex'; }
  function hideTyping() { document.getElementById('ducor-chat-typing').style.display = 'none'; }

  function setHandoffUI(status) {
    sessionStatus = status || 'ai';
    handoffMode = status === 'waiting' || status === 'human';
    const bar = document.getElementById('ducor-chat-handoff-bar');
    const subText = document.getElementById('ducor-chat-head-sub-text');
    const dot = document.getElementById('ducor-chat-status');
    const input = document.getElementById('ducor-chat-input');
    const cta = document.getElementById('ducor-chat-cta');
    dot.classList.remove('human', 'waiting');
    if (status === 'waiting') {
      bar.classList.add('show');
      bar.textContent = 'Connecting you to a pharmacist — the assistant is paused.';
      if (subText) subText.textContent = 'Connecting to pharmacist…';
      dot.classList.add('waiting');
      input.placeholder = 'Message the pharmacy team…';
      if (cta) cta.classList.add('hidden');
    } else if (status === 'human') {
      bar.classList.add('show');
      bar.textContent = 'You are chatting with a pharmacist.';
      if (subText) subText.textContent = 'Pharmacist · Live';
      dot.classList.add('human');
      input.placeholder = 'Message the pharmacist…';
      if (cta) cta.classList.add('hidden');
    } else {
      bar.classList.remove('show');
      bar.textContent = '';
      if (subText) subText.textContent = 'Online Assistant · Available 24/7';
      input.placeholder = 'Ask me anything about medications…';
      if (cta) cta.classList.remove('hidden');
    }
  }

  function isPharmacistHours(date) {
    const d = date || new Date();
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Africa/Monrovia',
        weekday: 'short',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false
      }).formatToParts(d);
      const map = {};
      parts.forEach(function (p) { if (p.type !== 'literal') map[p.type] = p.value; });
      const day = map.weekday;
      let hour = parseInt(map.hour, 10);
      const minute = parseInt(map.minute, 10);
      // Some engines emit hour "24" for midnight
      if (hour === 24) hour = 0;
      const mins = hour * 60 + minute;
      const weekday = day !== 'Sun';
      return weekday && mins >= 9 * 60 && mins < 17 * 60;
    } catch (e) {
      // Fallback: treat browser local as Monrovia (UTC+0)
      const day = d.getUTCDay(); // 0=Sun
      const mins = d.getUTCHours() * 60 + d.getUTCMinutes();
      return day >= 1 && day <= 6 && mins >= 9 * 60 && mins < 17 * 60;
    }
  }

  function newSessionId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  async function ensureFirebase() {
    if (fb) return fb;
    const appMod = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
    const fsMod = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const app = appMod.getApps().length ? appMod.getApps()[0] : appMod.initializeApp(FB_CONFIG);
    const db = fsMod.getFirestore(app);
    fb = {
      db: db,
      doc: fsMod.doc,
      getDoc: fsMod.getDoc,
      setDoc: fsMod.setDoc,
      updateDoc: fsMod.updateDoc,
      collection: fsMod.collection,
      addDoc: fsMod.addDoc,
      onSnapshot: fsMod.onSnapshot,
      query: fsMod.query,
      orderBy: fsMod.orderBy,
      serverTimestamp: fsMod.serverTimestamp,
      Timestamp: fsMod.Timestamp,
      increment: fsMod.increment
    };
    return fb;
  }

  function sessionCodeFromId(id) {
    return String(id || '').replace(/-/g, '').slice(0, 8).toUpperCase();
  }

  async function ensureSessionDoc(status) {
    const F = await ensureFirebase();
    if (!sessionId) {
      try { sessionId = sessionStorage.getItem(SESSION_KEY); } catch (e) {}
      if (!sessionId) {
        sessionId = newSessionId();
        try { sessionStorage.setItem(SESSION_KEY, sessionId); } catch (e) {}
      }
    }
    const ref = F.doc(F.db, 'chat_sessions', sessionId);
    const payload = {
      status: status || 'waiting',
      updatedAt: F.serverTimestamp(),
      pageUrl: String(location.href || '').slice(0, 500),
      preview: String(((chatHistory.find(function (m) { return m.role === 'user'; }) || {}).content || 'Chat request')).slice(0, 200),
      unreadStaff: 0,
      unreadClient: 0,
      sessionCode: sessionCodeFromId(sessionId),
      waBridgeChatId: '231778174157@c.us',
      waBridgeEnabled: true
    };
    try {
      const existing = await F.getDoc(ref);
      if (existing.exists()) {
        await F.updateDoc(ref, {
          status: payload.status,
          updatedAt: payload.updatedAt,
          pageUrl: payload.pageUrl,
          preview: payload.preview,
          sessionCode: payload.sessionCode,
          waBridgeChatId: payload.waBridgeChatId,
          waBridgeEnabled: payload.waBridgeEnabled
        });
      } else {
        await F.setDoc(ref, Object.assign({ createdAt: F.serverTimestamp() }, payload));
      }
    } catch (e) {
      console.error('chat session create failed', e);
      throw e;
    }
    return ref;
  }

  async function writeMessage(role, content, extra, opts) {
    opts = opts || {};
    const F = await ensureFirebase();
    const ref = F.doc(F.db, 'chat_sessions', sessionId);
    const msg = Object.assign({
      role: role,
      content: String(content).slice(0, 4000),
      createdAt: F.serverTimestamp()
    }, extra || {});
    await F.addDoc(F.collection(ref, 'messages'), msg);
    const patch = {
      updatedAt: F.serverTimestamp(),
      lastMessage: String(content).slice(0, 200),
      lastMessageAt: F.serverTimestamp(),
      lastMessageRole: role
    };
    if (!opts.quiet) {
      if (role === 'user') patch.unreadStaff = F.increment(1);
      if (role === 'staff') patch.unreadClient = F.increment(1);
    }
    try { await F.updateDoc(ref, patch); } catch (e) { /* rules may block some fields mid-handoff */ }
  }

  function stopListeners() {
    if (unsubSession) { try { unsubSession(); } catch (e) {} unsubSession = null; }
    if (unsubMessages) { try { unsubMessages(); } catch (e) {} unsubMessages = null; }
  }

  async function startListeners() {
    const F = await ensureFirebase();
    stopListeners();
    const ref = F.doc(F.db, 'chat_sessions', sessionId);
    unsubSession = F.onSnapshot(ref, function (snap) {
      if (!snap.exists()) return;
      const data = snap.data() || {};
      const st = data.status || 'ai';
      const prev = sessionStatus;
      setHandoffUI(st);
      // System notices (joined / returned to AI) arrive via the messages listener
    });
    const mq = F.query(F.collection(ref, 'messages'), F.orderBy('createdAt', 'asc'));
    unsubMessages = F.onSnapshot(mq, function (snap) {
      snap.docChanges().forEach(function (change) {
        if (change.type !== 'added') return;
        const id = change.doc.id;
        if (renderedMsgIds.has(id)) return;
        const m = change.doc.data() || {};
        const role = m.role;
        if (role === 'user') {
          // Client already showed their own outbound messages
          renderedMsgIds.add(id);
          return;
        }
        if (role === 'staff') {
          appendMsg(m.content || '', 'staff', { id: id, label: m.senderName || 'Pharmacist' });
          if (!chatOpen) document.getElementById('ducor-chat-badge').style.display = 'flex';
        } else if (role === 'system') {
          appendMsg(m.content || '', 'system', { id: id });
        } else if (role === 'assistant') {
          // Historical AI lines seeded at handoff — skip if we already have local UI
          renderedMsgIds.add(id);
        }
      });
    });
  }

  async function seedTranscript() {
    // Copy recent local AI history into Firestore once at handoff so staff see context
    const recent = chatHistory.slice(-12);
    for (let i = 0; i < recent.length; i++) {
      const m = recent[i];
      if (!m || !m.content) continue;
      const role = m.role === 'assistant' ? 'assistant' : 'user';
      await writeMessage(role, m.content, null, { quiet: true });
    }
  }

  /** Notify Lucas Lonestar WhatsApp ONLY via server (Green API token never client-side). */
  async function notifyLonestarWhatsApp(kind, lastMessage) {
    if (!LONESTAR_BRIDGE_ENABLED || !sessionId) return;
    try {
      await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: kind === 'followup' ? 'chat_handoff_followup' : 'chat_handoff',
          handoff: {
            sessionId: sessionId,
            sessionCode: sessionCodeFromId(sessionId),
            lastMessage: String(lastMessage || '').slice(0, 500),
            preview: String(lastMessage || '').slice(0, 200),
            pageUrl: String(location.href || '').slice(0, 500)
          }
        })
      });
    } catch (e) {
      console.warn('Lonestar WhatsApp notify failed', e);
    }
  }

  async function requestHuman() {
    if (!chatOpen) openChat();
    if (handoffMode && (sessionStatus === 'waiting' || sessionStatus === 'human')) {
      appendMsg('You are already in the pharmacist queue. Please wait — a pharmacist will reply here.', 'system');
      return;
    }
    // After-hours: still start handoff + WhatsApp-notify Lucas Lonestar so he can
    // reply from WhatsApp (try-now / testing). Show hours note but do not block.
    const afterHours = !isPharmacistHours();
    if (afterHours) {
      appendMsg(HOURS_MSG, 'bot', { allowHtml: true });
    }
    showTyping();
    try {
      await ensureSessionDoc('waiting');
      const code = sessionCodeFromId(sessionId);
      const lastUser = ((chatHistory.slice().reverse().find(function (m) { return m.role === 'user'; }) || {}).content) || '';
      // Update status explicitly to waiting + mark WhatsApp bridge fields for Lonestar
      const F = await ensureFirebase();
      await F.updateDoc(F.doc(F.db, 'chat_sessions', sessionId), {
        status: 'waiting',
        updatedAt: F.serverTimestamp(),
        pageUrl: String(location.href || '').slice(0, 500),
        sessionCode: code,
        waBridgeChatId: '231778174157@c.us', // Lucas Lonestar ONLY
        waBridgeEnabled: true
      });
      await seedTranscript();
      await writeMessage('system', 'Connecting you to a pharmacist. Please wait here — the assistant is paused for this chat.');
      await startListeners();
      // Server-side Green API → Lonestar only (token never exposed here)
      await notifyLonestarWhatsApp('handoff', lastUser || 'Customer tapped Talk to pharmacist');
      hideTyping();
      setHandoffUI('waiting');
      if (afterHours) {
        appendMsg('Connecting you to a pharmacist. Please wait here — the assistant is paused for this chat. Desk hours are Mon–Sat 9AM–5PM (Monrovia). If urgent: ' + CONTACT_HTML + '.', 'system', { allowHtml: true });
      } else {
        appendMsg('Connecting you to a pharmacist. Please wait here — the assistant is paused for this chat. If urgent: ' + CONTACT_HTML + '.', 'system', { allowHtml: true });
      }
    } catch (e) {
      hideTyping();
      console.error(e);
      appendMsg('I could not start a live pharmacist chat right now. Please use ' + CONTACT_HTML + ', or keep chatting with me.', 'bot', { allowHtml: true });
      setHandoffUI('ai');
    }
  }

  async function sendHumanMessage(text) {
    appendMsg(text, 'user');
    chatHistory.push({ role: 'user', content: text });
    try {
      if (!sessionId) await ensureSessionDoc(sessionStatus === 'human' ? 'waiting' : 'waiting');
      await writeMessage('user', text);
      if (!unsubMessages) await startListeners();
      // Forward follow-ups to Lonestar WhatsApp so the thread stays bidirectional
      await notifyLonestarWhatsApp('followup', text);
    } catch (e) {
      console.error(e);
      appendMsg('Message could not be delivered. Please try again or use ' + CONTACT_HTML + '.', 'system', { allowHtml: true });
    }
  }

  async function sendMessage() {
    const input = document.getElementById('ducor-chat-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    if (!chatOpen) openChat();

    // Human / waiting mode — no AI
    if (handoffMode && (sessionStatus === 'waiting' || sessionStatus === 'human')) {
      await sendHumanMessage(text);
      return;
    }

    // Detect intent to talk to a human (handoff + Lonestar WhatsApp anytime)
    if (HUMAN_INTENT.test(text)) {
      appendMsg(text, 'user');
      chatHistory.push({ role: 'user', content: text });
      await requestHuman();
      return;
    }

    appendMsg(text, 'user');
    chatHistory.push({ role: 'user', content: text });

    showTyping();

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatHistory })
      });
      const data = await resp.json();
      hideTyping();
      if (data.creditError) {
        appendMsg('We are not available at this moment. Please contact us directly — ' + CONTACT_HTML + '. We will be happy to assist you.', 'bot', { allowHtml: true });
      } else if (data.reply) {
        appendMsg(data.reply, 'bot');
        chatHistory.push({ role: 'assistant', content: data.reply });
        if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);
      } else {
        appendMsg('Sorry, I\'m having trouble connecting right now. For immediate help please WhatsApp us: ' + CONTACT_HTML + '.', 'bot', { allowHtml: true });
      }
    } catch (e) {
      hideTyping();
      appendMsg('I\'m temporarily offline. For urgent help, please WhatsApp or call us directly: ' + CONTACT_HTML + '.', 'bot', { allowHtml: true });
    }
  }

  // Resume handoff if this tab already had a live session
  (async function resumeIfNeeded() {
    try {
      const existing = sessionStorage.getItem(SESSION_KEY);
      if (!existing) return;
      sessionId = existing;
      const F = await ensureFirebase();
      const snapUnsub = F.onSnapshot(F.doc(F.db, 'chat_sessions', sessionId), function (snap) {
        snapUnsub();
        if (!snap.exists()) return;
        const st = (snap.data() || {}).status;
        if (st === 'waiting' || st === 'human') {
          setHandoffUI(st);
          startListeners();
        }
      });
    } catch (e) { /* ignore */ }
  })();
}

// ══════════════════════════════════════════
//  BOOT
// ══════════════════════════════════════════
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

function boot() {
  // Prefer shop.js export; also accept category-keyed PRODUCTS if present
  if (!window.DUCOR_PRODUCTS || !window.DUCOR_PRODUCTS.length) {
    try {
      if (typeof PRODUCTS !== 'undefined' && PRODUCTS) {
        window.DUCOR_PRODUCTS = flattenCatalog(PRODUCTS);
      }
    } catch (e) { /* shop.js not on this page */ }
  }
  initSearch();
  initChat();
  // Prefetch catalog on pages that don't include shop.js (e.g. homepage)
  ensureProductCatalog();
}

})();
