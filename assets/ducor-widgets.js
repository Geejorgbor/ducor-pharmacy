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

    #ducor-chat-reason{display:none;padding:10px 12px 12px;background:linear-gradient(180deg,rgba(201,160,85,0.1),rgba(7,20,34,0));border-bottom:1px solid rgba(201,160,85,0.22);flex-shrink:0}
    #ducor-chat-reason.show{display:block}
    #ducor-chat-reason-prompt{margin:0 0 8px;color:rgba(255,255,255,0.82);font-size:0.78rem;font-weight:600;line-height:1.35}
    #ducor-chat-reason-options{display:flex;flex-wrap:wrap;gap:6px}
    .ducor-reason-btn{background:rgba(255,255,255,0.06);border:1px solid rgba(201,160,85,0.32);color:rgba(240,217,168,0.95);font-size:0.72rem;font-weight:600;padding:7px 11px;border-radius:999px;cursor:pointer;transition:background .15s,border-color .15s,color .15s,transform .12s;font-family:inherit;line-height:1.2}
    .ducor-reason-btn:hover{background:rgba(201,160,85,0.18);border-color:rgba(201,160,85,0.5);color:#f5e6c8}
    .ducor-reason-btn:focus-visible{outline:2px solid #c9a055;outline-offset:2px}
    .ducor-reason-btn.selected{background:rgba(201,160,85,0.28);border-color:#c9a055;color:#fff}
    #ducor-chat-reason-other{display:none;margin-top:8px}
    #ducor-chat-reason-other.show{display:block}
    #ducor-chat-reason-other-input{width:100%;box-sizing:border-box;background:rgba(255,255,255,0.07);border:1.5px solid rgba(255,255,255,0.12);border-radius:10px;padding:9px 11px;font-size:0.8rem;color:#fff;font-family:inherit;outline:none;resize:none;min-height:38px;max-height:72px;line-height:1.35}
    #ducor-chat-reason-other-input:focus{border-color:rgba(201,160,85,0.55);box-shadow:0 0 0 3px rgba(201,160,85,0.12)}
    #ducor-chat-reason-other-input::placeholder{color:rgba(255,255,255,0.38)}
    #ducor-chat-contact{display:none;margin-top:10px}
    #ducor-chat-contact.show{display:block}
    #ducor-chat-contact-prompt{margin:0 0 6px;color:rgba(255,255,255,0.75);font-size:0.74rem;font-weight:600;line-height:1.35}
    #ducor-chat-client-name,#ducor-chat-client-phone{width:100%;box-sizing:border-box;background:rgba(255,255,255,0.07);border:1.5px solid rgba(255,255,255,0.12);border-radius:10px;padding:9px 11px;font-size:0.8rem;color:#fff;font-family:inherit;outline:none;line-height:1.35;margin-bottom:6px}
    #ducor-chat-client-name:focus,#ducor-chat-client-phone:focus{border-color:rgba(201,160,85,0.55);box-shadow:0 0 0 3px rgba(201,160,85,0.12)}
    #ducor-chat-client-name::placeholder,#ducor-chat-client-phone::placeholder{color:rgba(255,255,255,0.38)}
    #ducor-chat-client-name.ducor-field-error{border-color:rgba(248,113,113,0.7)}
    #ducor-chat-reason-actions{display:flex;align-items:center;gap:8px;margin-top:8px;flex-wrap:wrap}
    #ducor-chat-reason-connect{display:none;flex:1;min-width:120px;padding:9px 12px;border:none;border-radius:10px;cursor:pointer;font-family:inherit;font-size:0.8rem;font-weight:700;color:#071422;background:linear-gradient(135deg,#d4b06a 0%,#c9a055 45%,#a87830 100%);box-shadow:0 3px 10px rgba(201,160,85,0.3)}
    #ducor-chat-reason-connect.show{display:inline-flex;align-items:center;justify-content:center}
    #ducor-chat-reason-connect:disabled{opacity:.55;cursor:not-allowed}
    #ducor-chat-reason-cancel{background:transparent;border:none;color:rgba(255,255,255,0.55);font-size:0.74rem;font-weight:600;cursor:pointer;padding:8px 6px;font-family:inherit}
    #ducor-chat-reason-cancel:hover{color:#e0c080}
  
  `;
  document.head.appendChild(style);

  const CONTACT_HTML = '<a href="https://wa.me/16309366050" target="_blank" rel="noopener">WhatsApp +1 (630) 936-6050</a> · <a href="https://wa.me/231880187490" target="_blank" rel="noopener">+231 880 187 490</a> · <a href="https://wa.me/231760801914" target="_blank" rel="noopener">+231 760 801 914</a>';
  const HOURS_MSG = 'Our pharmacists are available Monday–Saturday, 9AM–5PM (Monrovia time). Outside those hours I can keep helping as your online assistant, or you can reach the team anytime: ' + CONTACT_HTML + '.';
  // WhatsApp bridge: server notifies Lonestar + Boss (275). Client stores primary
  // waBridgeChatId = Lonestar only. Handoff allowed ANYTIME (after-hours ok).
  // Client UI never shows boss/Lonestar bridge numbers — only public contact links.
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
    <div id="ducor-chat-reason" role="group" aria-label="Why would you like to talk to a pharmacist?">
      <p id="ducor-chat-reason-prompt">What can the pharmacist help with?</p>
      <div id="ducor-chat-reason-options">
        <button type="button" class="ducor-reason-btn" data-reason="urgent" data-label="Urgent">Urgent</button>
        <button type="button" class="ducor-reason-btn" data-reason="personal" data-label="Personal">Personal</button>
        <button type="button" class="ducor-reason-btn" data-reason="prescription" data-label="Prescription question">Prescription question</button>
        <button type="button" class="ducor-reason-btn" data-reason="assistant" data-label="Assistant couldn&#39;t help">Assistant couldn&#39;t help</button>
        <button type="button" class="ducor-reason-btn" data-reason="other" data-label="Other">Other</button>
      </div>
      <div id="ducor-chat-reason-other">
        <textarea id="ducor-chat-reason-other-input" rows="2" maxlength="160" placeholder="A few words (optional)…" aria-label="Brief reason"></textarea>
      </div>
      <div id="ducor-chat-contact">
        <p id="ducor-chat-contact-prompt">Please share your name so the pharmacist can greet you</p>
        <input id="ducor-chat-client-name" type="text" maxlength="80" autocomplete="name" placeholder="Your name *" aria-label="Your name (required)" required />
        <input id="ducor-chat-client-phone" type="tel" maxlength="40" autocomplete="tel" placeholder="Phone number (optional)" aria-label="Phone number (optional)" />
      </div>
      <div id="ducor-chat-reason-actions">
        <button type="button" id="ducor-chat-reason-connect">Connect to pharmacist</button>
        <button type="button" id="ducor-chat-reason-cancel">Not now</button>
      </div>
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
    openReasonGate();
  });
  document.getElementById('ducor-chat-quick').addEventListener('click', e => {
    const b = e.target.closest('.ducor-quick-btn');
    if (!b) return;
    if (b.getAttribute('data-human')) {
      openReasonGate();
      return;
    }
    const q = b.getAttribute('data-quick');
    if (q) ducorChatQuick(q);
  });
  document.getElementById('ducor-chat-reason-options').addEventListener('click', function (e) {
    const b = e.target.closest('.ducor-reason-btn');
    if (!b) return;
    selectReasonOption(b);
  });
  document.getElementById('ducor-chat-reason-cancel').addEventListener('click', function () {
    closeReasonGate();
  });
  document.getElementById('ducor-chat-reason-connect').addEventListener('click', function () {
    confirmReasonAndHandoff();
  });
  document.getElementById('ducor-chat-reason-other-input').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      confirmReasonAndHandoff();
    }
  });
  document.getElementById('ducor-chat-client-name').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      confirmReasonAndHandoff();
    }
  });
  document.getElementById('ducor-chat-client-phone').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      confirmReasonAndHandoff();
    }
  });
  document.getElementById('ducor-chat-client-name').addEventListener('input', function () {
    this.classList.remove('ducor-field-error');
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
  window.ducorRequestHuman = openReasonGate;

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


  let reasonGateOpen = false;
  let selectedReason = null; // { id, label }

  let knownClientCache = null; // resolved account for this gate open

  function resetContactFields() {
    knownClientCache = null;
    const nameInput = document.getElementById('ducor-chat-client-name');
    const phoneInput = document.getElementById('ducor-chat-client-phone');
    const contactWrap = document.getElementById('ducor-chat-contact');
    const prompt = document.getElementById('ducor-chat-contact-prompt');
    if (nameInput) {
      nameInput.value = '';
      nameInput.classList.remove('ducor-field-error');
      nameInput.style.display = '';
    }
    if (phoneInput) phoneInput.value = '';
    if (prompt) prompt.textContent = 'Please share your name so the pharmacist can greet you';
    if (contactWrap) contactWrap.classList.remove('show');
  }

  function readLocalDucorAccount() {
    try {
      const sessRaw = sessionStorage.getItem('ducor_sess_v2') || localStorage.getItem('ducor_sess_v2');
      if (!sessRaw) return null;
      const sess = JSON.parse(sessRaw);
      if (!sess || !sess.userId) return null;
      // Session expiry mirrors auth.html (30 min default, or 7 days if remember)
      if (sess.expiry && Date.now() > Number(sess.expiry)) return null;
      const users = JSON.parse(localStorage.getItem('ducor_users_v2') || '[]');
      const user = (Array.isArray(users) ? users : []).find(function (u) {
        return u && (u.id === sess.userId || u.uid === sess.userId);
      });
      if (!user) return { uid: sess.userId, clientName: '', clientPhone: '', clientEmail: '', source: 'session' };
      const name = [user.fname, user.lname].filter(Boolean).join(' ').trim()
        || String(user.displayName || user.name || '').trim()
        || (user.email ? String(user.email).split('@')[0] : '');
      return {
        uid: user.id || user.uid || sess.userId || '',
        clientName: String(name || '').trim().slice(0, 80),
        clientPhone: String(user.phone || '').trim().slice(0, 40),
        clientEmail: String(user.email || '').trim().slice(0, 120),
        source: 'ducor_account'
      };
    } catch (e) {
      return null;
    }
  }

  async function resolveKnownClient() {
    const local = readLocalDucorAccount();
    if (local && local.clientName) return local;
    // Firebase Auth fallback (Google / email accounts)
    try {
      const appMod = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
      const authMod = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
      const app = appMod.getApps().length ? appMod.getApps()[0] : appMod.initializeApp(FB_CONFIG);
      const auth = authMod.getAuth(app);
      const u = auth.currentUser;
      if (u) {
        const name = String(u.displayName || '').trim()
          || (u.email ? String(u.email).split('@')[0] : '');
        return {
          uid: u.uid || '',
          clientName: name.slice(0, 80),
          clientPhone: (local && local.clientPhone) || '',
          clientEmail: String(u.email || (local && local.clientEmail) || '').slice(0, 120),
          source: 'firebase_auth'
        };
      }
    } catch (e) { /* auth optional on public pages */ }
    return local; // may have uid without name
  }

  function showContactStep() {
    const contactWrap = document.getElementById('ducor-chat-contact');
    const connectBtn = document.getElementById('ducor-chat-reason-connect');
    const nameInput = document.getElementById('ducor-chat-client-name');
    const phoneInput = document.getElementById('ducor-chat-client-phone');
    const prompt = document.getElementById('ducor-chat-contact-prompt');
    if (connectBtn) {
      connectBtn.classList.add('show');
      connectBtn.disabled = false;
    }
    // Resolve account (sync local first; async auth fills if needed)
    knownClientCache = readLocalDucorAccount();
    applyKnownClientToContactUI(knownClientCache);
    resolveKnownClient().then(function (known) {
      if (!reasonGateOpen) return;
      if (known && known.clientName) {
        knownClientCache = known;
        applyKnownClientToContactUI(known);
      }
    });
    if (contactWrap) contactWrap.classList.add('show');
  }

  function applyKnownClientToContactUI(known) {
    const contactWrap = document.getElementById('ducor-chat-contact');
    const nameInput = document.getElementById('ducor-chat-client-name');
    const phoneInput = document.getElementById('ducor-chat-client-phone');
    const prompt = document.getElementById('ducor-chat-contact-prompt');
    if (!nameInput) return;
    if (known && known.clientName) {
      // Logged-in: do not force retyping — hide name field, polite note
      nameInput.value = known.clientName;
      nameInput.classList.remove('ducor-field-error');
      nameInput.style.display = 'none';
      if (phoneInput) {
        if (known.clientPhone && !phoneInput.value) phoneInput.value = known.clientPhone;
        // Keep phone optional & visible so they can update if they want
        phoneInput.placeholder = 'Phone number (optional)';
      }
      if (prompt) {
        prompt.textContent = 'Connecting as ' + known.clientName + ' — tap Connect when ready';
      }
      if (contactWrap) contactWrap.classList.add('show');
    } else {
      nameInput.style.display = '';
      nameInput.value = nameInput.value || '';
      if (prompt) prompt.textContent = 'Please share your name so the pharmacist can greet you';
      setTimeout(function () {
        if (nameInput && nameInput.style.display !== 'none') nameInput.focus();
      }, 50);
    }
  }

  function openReasonGate() {
    if (!chatOpen) openChat();
    if (handoffMode && (sessionStatus === 'waiting' || sessionStatus === 'human')) {
      appendMsg('You are already in the pharmacist queue. Please wait — a pharmacist will reply here.', 'system');
      return;
    }
    reasonGateOpen = true;
    selectedReason = null;
    const gate = document.getElementById('ducor-chat-reason');
    const cta = document.getElementById('ducor-chat-cta');
    const otherWrap = document.getElementById('ducor-chat-reason-other');
    const otherInput = document.getElementById('ducor-chat-reason-other-input');
    const connectBtn = document.getElementById('ducor-chat-reason-connect');
    gate.classList.add('show');
    if (cta) cta.classList.add('hidden');
    otherWrap.classList.remove('show');
    if (otherInput) otherInput.value = '';
    resetContactFields();
    connectBtn.classList.remove('show');
    connectBtn.disabled = false;
    Array.prototype.forEach.call(document.querySelectorAll('.ducor-reason-btn'), function (btn) {
      btn.classList.remove('selected');
    });
  }

  function closeReasonGate() {
    reasonGateOpen = false;
    selectedReason = null;
    const gate = document.getElementById('ducor-chat-reason');
    const cta = document.getElementById('ducor-chat-cta');
    const otherWrap = document.getElementById('ducor-chat-reason-other');
    const otherInput = document.getElementById('ducor-chat-reason-other-input');
    const connectBtn = document.getElementById('ducor-chat-reason-connect');
    if (gate) gate.classList.remove('show');
    if (otherWrap) otherWrap.classList.remove('show');
    if (otherInput) otherInput.value = '';
    resetContactFields();
    if (connectBtn) connectBtn.classList.remove('show');
    // Restore CTA only when not already in a live handoff
    if (cta && sessionStatus !== 'waiting' && sessionStatus !== 'human') {
      cta.classList.remove('hidden');
    }
  }

  function selectReasonOption(btn) {
    Array.prototype.forEach.call(document.querySelectorAll('.ducor-reason-btn'), function (b) {
      b.classList.remove('selected');
    });
    btn.classList.add('selected');
    const id = btn.getAttribute('data-reason');
    const label = btn.getAttribute('data-label') || id;
    selectedReason = { id: id, label: label };
    const otherWrap = document.getElementById('ducor-chat-reason-other');
    if (id === 'other') {
      otherWrap.classList.add('show');
      setTimeout(function () {
        const inp = document.getElementById('ducor-chat-reason-other-input');
        if (inp) inp.focus();
      }, 50);
    } else {
      otherWrap.classList.remove('show');
    }
    // After any reason chip: collect name (required) before connect
    showContactStep();
  }

  function buildAskingAbout(reasonInfo) {
    const parts = [];
    // Product / medication page interest
    try {
      const path = String(location.pathname || '');
      const params = new URLSearchParams(location.search || '');
      if (/product\.html/i.test(path)) {
        const id = params.get('id') || '';
        const cat = params.get('cat') || '';
        let hint = 'Product interest';
        if (id) hint += ': ' + id;
        if (cat) hint += ' (' + cat + ')';
        parts.push(hint);
      } else if (/prescription\.html/i.test(path)) {
        parts.push('Browsing prescription medications');
      } else if (/otc\.html/i.test(path)) {
        parts.push('Browsing over-the-counter medications');
      } else if (/vitamins\.html/i.test(path)) {
        parts.push('Browsing vitamins & supplements');
      }
    } catch (e) { /* ignore */ }
    if (reasonInfo && reasonInfo.id === 'prescription') {
      parts.push('Prescription / medication question');
    }
    // Recent user asks from chat history
    const userMsgs = chatHistory
      .filter(function (m) { return m && m.role === 'user' && m.content; })
      .map(function (m) { return String(m.content).trim(); })
      .filter(Boolean);
    const recent = userMsgs.slice(-2);
    if (recent.length) {
      parts.push(recent.join(' · '));
    }
    const joined = parts.join(' — ').replace(/\s+/g, ' ').trim();
    return joined.slice(0, 280);
  }

  function buildReasonPayload() {
    if (!selectedReason) return null;
    const detail = (document.getElementById('ducor-chat-reason-other-input') || {}).value || '';
    const detailTrim = String(detail).trim().slice(0, 160);
    const nameInput = document.getElementById('ducor-chat-client-name');
    const phoneInput = document.getElementById('ducor-chat-client-phone');
    const typedName = String((nameInput && nameInput.value) || '').trim().slice(0, 80);
    const typedPhone = String((phoneInput && phoneInput.value) || '').trim().slice(0, 40);
    const known = knownClientCache || readLocalDucorAccount();
    const clientName = typedName || (known && known.clientName) || '';
    const clientPhone = typedPhone || (known && known.clientPhone) || '';
    const clientEmail = (known && known.clientEmail) || '';
    const clientUid = (known && known.uid) || '';
    let staffLabel = selectedReason.label;
    if (selectedReason.id === 'other' && detailTrim) {
      staffLabel = 'Other: ' + detailTrim;
    } else if (selectedReason.id === 'other') {
      staffLabel = 'Other';
    }
    const base = {
      id: selectedReason.id,
      label: selectedReason.label,
      detail: detailTrim,
      staffLabel: staffLabel,
      clientName: clientName,
      clientPhone: clientPhone,
      clientEmail: clientEmail,
      clientUid: clientUid
    };
    base.askingAbout = buildAskingAbout(base);
    return base;
  }

  function confirmReasonAndHandoff() {
    const payload = buildReasonPayload();
    if (!payload) return;
    const nameInput = document.getElementById('ducor-chat-client-name');
    if (!payload.clientName) {
      if (nameInput) {
        nameInput.classList.add('ducor-field-error');
        nameInput.focus();
      }
      return;
    }
    closeReasonGate();
    requestHuman(payload);
  }

  function setHandoffUI(status) {
    sessionStatus = status || 'ai';
    handoffMode = status === 'waiting' || status === 'human';
    const bar = document.getElementById('ducor-chat-handoff-bar');
    const subText = document.getElementById('ducor-chat-head-sub-text');
    const dot = document.getElementById('ducor-chat-status');
    const input = document.getElementById('ducor-chat-input');
    const cta = document.getElementById('ducor-chat-cta');
    const reasonGate = document.getElementById('ducor-chat-reason');
    dot.classList.remove('human', 'waiting');
    if (status === 'waiting') {
      bar.classList.add('show');
      bar.textContent = 'Connecting you to a pharmacist — the assistant is paused.';
      if (subText) subText.textContent = 'Connecting to pharmacist…';
      dot.classList.add('waiting');
      input.placeholder = 'Message the pharmacy team…';
      if (cta) cta.classList.add('hidden');
      if (reasonGate) reasonGate.classList.remove('show');
      reasonGateOpen = false;
    } else if (status === 'human') {
      bar.classList.add('show');
      bar.textContent = 'You are chatting with a pharmacist.';
      if (subText) subText.textContent = 'Pharmacist · Live';
      dot.classList.add('human');
      input.placeholder = 'Message the pharmacist…';
      if (cta) cta.classList.add('hidden');
      if (reasonGate) reasonGate.classList.remove('show');
      reasonGateOpen = false;
    } else {
      bar.classList.remove('show');
      bar.textContent = '';
      if (subText) subText.textContent = 'Online Assistant · Available 24/7';
      input.placeholder = 'Ask me anything about medications…';
      if (cta && !reasonGateOpen) cta.classList.remove('hidden');
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
      waBridgeChatId: '231778174157@c.us', // primary; inbound also accepts 231887221275@c.us
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

  /** Notify handoff WhatsApps (Lonestar + 275) via server — token never client-side. */
  async function notifyLonestarWhatsApp(kind, lastMessage, meta) {
    if (!LONESTAR_BRIDGE_ENABLED || !sessionId) return;
    meta = meta || {};
    try {
      const reason = String(meta.reason || '').slice(0, 200);
      const clientName = String(meta.clientName || '').slice(0, 80);
      const clientPhone = String(meta.clientPhone || '').slice(0, 40);
      const clientEmail = String(meta.clientEmail || '').slice(0, 120);
      const clientUid = String(meta.clientUid || '').slice(0, 80);
      const askingAbout = String(meta.askingAbout || '').slice(0, 280);
      // Keep a compact lastMessage; dedicated fields carry Name / Reason / Asking about
      // for newer API builds. Older builds still see reason in lastMessage text.
      let alertLast = String(lastMessage || '').slice(0, 500);
      if (kind !== 'followup') {
        const bits = [];
        if (clientName) bits.push('Name: ' + clientName);
        if (reason) bits.push('Reason: ' + reason);
        if (askingAbout) bits.push('Asking about: ' + askingAbout);
        if (bits.length) {
          alertLast = (bits.join(' — ') + (alertLast ? ' — ' + alertLast : '')).slice(0, 500);
        }
      }
      await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: kind === 'followup' ? 'chat_handoff_followup' : 'chat_handoff',
          handoff: {
            sessionId: sessionId,
            sessionCode: sessionCodeFromId(sessionId),
            lastMessage: alertLast,
            preview: alertLast.slice(0, 200),
            reason: reason,
            clientName: clientName,
            clientPhone: clientPhone,
            clientEmail: clientEmail,
            clientUid: clientUid,
            askingAbout: askingAbout,
            pageUrl: String(location.href || '').slice(0, 500)
          }
        })
      });
    } catch (e) {
      console.warn('Handoff WhatsApp notify failed', e);
    }
  }

  async function requestHuman(reasonInfo) {
    if (!chatOpen) openChat();
    if (handoffMode && (sessionStatus === 'waiting' || sessionStatus === 'human')) {
      appendMsg('You are already in the pharmacist queue. Please wait — a pharmacist will reply here.', 'system');
      return;
    }
    const reason = reasonInfo && reasonInfo.staffLabel
      ? String(reasonInfo.staffLabel).slice(0, 200)
      : (reasonInfo && reasonInfo.label ? String(reasonInfo.label).slice(0, 200) : '');
    const clientName = reasonInfo && reasonInfo.clientName
      ? String(reasonInfo.clientName).trim().slice(0, 80)
      : '';
    const clientPhone = reasonInfo && reasonInfo.clientPhone
      ? String(reasonInfo.clientPhone).trim().slice(0, 40)
      : '';
    const clientEmail = reasonInfo && reasonInfo.clientEmail
      ? String(reasonInfo.clientEmail).trim().slice(0, 120)
      : '';
    const clientUid = reasonInfo && reasonInfo.clientUid
      ? String(reasonInfo.clientUid).trim().slice(0, 80)
      : '';
    const askingAbout = reasonInfo && reasonInfo.askingAbout
      ? String(reasonInfo.askingAbout).trim().slice(0, 280)
      : buildAskingAbout(reasonInfo || null);
    if (!clientName) {
      appendMsg('Please share your name so we can connect you with a pharmacist.', 'system');
      openReasonGate();
      return;
    }
    // After-hours: still start handoff + notify the pharmacy team so they can
    // reply (try-now / testing). Show hours note but do not block.
    const afterHours = !isPharmacistHours();
    if (afterHours) {
      appendMsg(HOURS_MSG, 'bot', { allowHtml: true });
    }
    showTyping();
    try {
      await ensureSessionDoc('waiting');
      const code = sessionCodeFromId(sessionId);
      const lastUser = ((chatHistory.slice().reverse().find(function (m) { return m.role === 'user'; }) || {}).content) || '';
      // Update status explicitly to waiting + mark WhatsApp bridge (primary Lonestar)
      const F = await ensureFirebase();
      const sessionPatch = {
        status: 'waiting',
        updatedAt: F.serverTimestamp(),
        pageUrl: String(location.href || '').slice(0, 500),
        sessionCode: code,
        waBridgeChatId: '231778174157@c.us', // primary; server also alerts 275
        waBridgeEnabled: true,
        clientName: clientName
      };
      if (clientPhone) sessionPatch.clientPhone = clientPhone;
      if (clientEmail) sessionPatch.clientEmail = clientEmail;
      if (clientUid) sessionPatch.clientUid = clientUid;
      if (askingAbout) sessionPatch.askingAbout = askingAbout;
      if (reason) {
        sessionPatch.handoffReason = reason;
        sessionPatch.preview = (clientName + ' · ' + reason).slice(0, 200);
      } else {
        sessionPatch.preview = clientName.slice(0, 200);
      }
      await F.updateDoc(F.doc(F.db, 'chat_sessions', sessionId), sessionPatch);
      await seedTranscript();
      // System note includes name + reason so staff see who/why in transcript
      const systemNote = 'Connecting you to a pharmacist'
        + (clientName ? ' — ' + clientName : '')
        + (reason ? ' (' + reason + ')' : '')
        + '. Please wait here — the assistant is paused for this chat.';
      await writeMessage('system', systemNote);
      await startListeners();
      // Server-side Green API → Lonestar + Boss 275 (token never exposed here)
      await notifyLonestarWhatsApp('handoff', lastUser || 'Customer requested a pharmacist', {
        reason: reason,
        clientName: clientName,
        clientPhone: clientPhone,
        clientEmail: clientEmail,
        clientUid: clientUid,
        askingAbout: askingAbout
      });
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
      // Forward follow-ups to handoff WhatsApps (Lonestar + 275) so thread stays bidirectional
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

    // Detect intent to talk to a pharmacist — reason gate before handoff
    if (HUMAN_INTENT.test(text)) {
      appendMsg(text, 'user');
      chatHistory.push({ role: 'user', content: text });
      openReasonGate();
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
