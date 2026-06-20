// Ducor International Pharmacy — Shared Widgets
// 1. Global Search (Ctrl+K)
// 2. AI Chat Assistant (24/7)

(function() {
'use strict';

// ══════════════════════════════════════════
//  PRODUCT DATA (mirrored from shop.js)
// ══════════════════════════════════════════
function getProducts() {
  if (window.DUCOR_PRODUCTS) return window.DUCOR_PRODUCTS;
  // Try to get from shop.js catalog if loaded
  if (window.products) return window.products;
  return [];
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
    renderResults('');
  }

  function closeSearch() {
    overlay.classList.remove('open');
    document.getElementById('ducor-search-q').value = '';
  }

  function renderResults(q) {
    const container = document.getElementById('ducor-search-results');
    const allProducts = getProducts();
    if (!q.trim()) {
      container.innerHTML = `<div id="ducor-search-empty">Start typing to search all 248 medications…</div>`;
      return;
    }
    const term = q.toLowerCase();
    const results = allProducts.filter(p =>
      p.name.toLowerCase().includes(term) ||
      (p.category || '').toLowerCase().includes(term) ||
      (p.description || '').toLowerCase().includes(term) ||
      (p.manufacturer || '').toLowerCase().includes(term)
    ).slice(0, 12);

    if (!results.length) {
      container.innerHTML = `<div id="ducor-search-empty">No results for "<strong style="color:#fff">${q}</strong>". Try a different name or category.</div>`;
      return;
    }
    const catPage = { prescription: '/prescription.html', otc: '/otc.html', vitamins: '/vitamins.html' };
    container.innerHTML = results.map((p, i) => `
      <a class="ducor-sr-item" href="${catPage[p.category] || '/prescription.html'}#${p.id}" data-idx="${i}">
        <span class="ducor-sr-badge ${p.category}">${p.category === 'prescription' ? 'RX' : p.category === 'otc' ? 'OTC' : 'VIT'}</span>
        <span class="ducor-sr-name">${p.name}</span>
        ${p.category === 'prescription' ? '' : `<span class="ducor-sr-price">$${p.price.toFixed(2)}</span>`}
      </a>`).join('');
    selectedIdx = -1;
  }

  document.getElementById('ducor-search-q').addEventListener('input', e => renderResults(e.target.value));
  document.getElementById('ducor-search-q').addEventListener('keydown', e => {
    const items = document.querySelectorAll('.ducor-sr-item');
    if (e.key === 'ArrowDown') { e.preventDefault(); selectedIdx = Math.min(selectedIdx+1, items.length-1); items.forEach((el,i) => el.style.background = i===selectedIdx ? 'rgba(201,160,85,0.12)' : ''); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); selectedIdx = Math.max(selectedIdx-1, -1); items.forEach((el,i) => el.style.background = i===selectedIdx ? 'rgba(201,160,85,0.12)' : ''); }
    if (e.key === 'Enter' && selectedIdx >= 0 && items[selectedIdx]) { items[selectedIdx].click(); closeSearch(); }
    if (e.key === 'Escape') closeSearch();
  });
  overlay.addEventListener('click', e => { if (e.target === overlay) closeSearch(); });
  document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openSearch(); } });
}

// ══════════════════════════════════════════
//  2. AI CHAT WIDGET
// ══════════════════════════════════════════
function initChat() {
  const style = document.createElement('style');
  style.textContent = `
    #ducor-chat-btn{position:fixed;bottom:28px;right:28px;z-index:9000;width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#0a2558,#0d9488);border:none;cursor:pointer;box-shadow:0 6px 28px rgba(10,37,88,0.45);display:flex;align-items:center;justify-content:center;transition:transform .2s,box-shadow .2s}
    #ducor-chat-btn:hover{transform:scale(1.08);box-shadow:0 10px 36px rgba(10,37,88,0.55)}
    #ducor-chat-badge{position:absolute;top:-3px;right:-3px;width:18px;height:18px;background:#dc2626;border-radius:50%;border:2px solid #fff;font-size:10px;font-weight:700;color:#fff;display:flex;align-items:center;justify-content:center}
    #ducor-chat-window{position:fixed;bottom:100px;right:28px;z-index:9000;width:370px;max-height:580px;background:#0a1929;border:1.5px solid rgba(201,160,85,0.3);border-radius:20px;box-shadow:0 24px 60px rgba(0,0,0,0.55);display:flex;flex-direction:column;opacity:0;pointer-events:none;transform:translateY(16px) scale(0.97);transition:all .25s}
    #ducor-chat-window.open{opacity:1;pointer-events:all;transform:translateY(0) scale(1)}
    @media(max-width:440px){#ducor-chat-window{right:8px;left:8px;width:auto;bottom:90px}}
    #ducor-chat-head{background:linear-gradient(135deg,#071a3e,#0a2558);padding:16px 18px;border-radius:18px 18px 0 0;display:flex;align-items:center;gap:12px;border-bottom:1px solid rgba(255,255,255,0.08)}
    #ducor-chat-head-avatar{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,rgba(201,160,85,0.3),rgba(13,148,136,0.3));border:1.5px solid rgba(201,160,85,0.5);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
    #ducor-chat-head-info h4{color:#fff;font-size:0.9rem;font-weight:700;margin-bottom:2px}
    #ducor-chat-head-info p{color:rgba(255,255,255,0.45);font-size:0.72rem}
    #ducor-chat-status{width:8px;height:8px;background:#22c55e;border-radius:50%;animation:chatPulse 2s infinite;margin-left:auto;flex-shrink:0}
    @keyframes chatPulse{0%,100%{opacity:1}50%{opacity:.4}}
    #ducor-chat-close{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.4);padding:4px;border-radius:6px;transition:color .2s;margin-left:4px}
    #ducor-chat-close:hover{color:#fff}
    #ducor-chat-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;max-height:360px}
    .ducor-msg{max-width:85%;padding:10px 14px;border-radius:14px;font-size:0.84rem;line-height:1.55}
    .ducor-msg.bot{background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.9);align-self:flex-start;border-radius:4px 14px 14px 14px}
    .ducor-msg.user{background:linear-gradient(135deg,#0a2558,#0d3a6e);color:#fff;align-self:flex-end;border-radius:14px 14px 4px 14px;border:1px solid rgba(201,160,85,0.2)}
    .ducor-msg.bot a{color:#c9a055;text-decoration:underline}
    #ducor-chat-typing{display:none;align-self:flex-start;background:rgba(255,255,255,0.08);padding:10px 16px;border-radius:4px 14px 14px 14px}
    #ducor-chat-typing span{display:inline-block;width:6px;height:6px;background:rgba(255,255,255,0.4);border-radius:50%;margin:0 2px;animation:typingDot 1.2s infinite}
    #ducor-chat-typing span:nth-child(2){animation-delay:.2s}
    #ducor-chat-typing span:nth-child(3){animation-delay:.4s}
    @keyframes typingDot{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}
    #ducor-chat-input-area{padding:12px 14px;border-top:1px solid rgba(255,255,255,0.08);display:flex;gap:8px}
    #ducor-chat-input{flex:1;background:rgba(255,255,255,0.07);border:1.5px solid rgba(255,255,255,0.1);border-radius:10px;padding:10px 12px;font-size:0.84rem;color:#fff;font-family:inherit;outline:none;transition:border-color .2s;resize:none}
    #ducor-chat-input:focus{border-color:rgba(201,160,85,0.4)}
    #ducor-chat-input::placeholder{color:rgba(255,255,255,0.25)}
    #ducor-chat-send{width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,#c9a055,#a87830);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity .2s}
    #ducor-chat-send:hover{opacity:0.85}
    #ducor-chat-quick{padding:0 14px 10px;display:flex;gap:6px;flex-wrap:wrap}
    .ducor-quick-btn{background:rgba(201,160,85,0.1);border:1px solid rgba(201,160,85,0.25);color:rgba(201,160,85,0.9);font-size:0.72rem;font-weight:600;padding:5px 10px;border-radius:50px;cursor:pointer;transition:all .15s;font-family:inherit}
    .ducor-quick-btn:hover{background:rgba(201,160,85,0.2)}
  `;
  document.head.appendChild(style);

  const btn = document.createElement('button');
  btn.id = 'ducor-chat-btn';
  btn.setAttribute('aria-label', 'Chat with Ducor International Pharmacy Customer Service');
  btn.innerHTML = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span id="ducor-chat-badge">1</span>`;

  const win = document.createElement('div');
  win.id = 'ducor-chat-window';
  win.innerHTML = `
    <div id="ducor-chat-head">
      <div id="ducor-chat-head-avatar">👨‍⚕️</div>
      <div id="ducor-chat-head-info">
        <h4>Lucas Paye</h4>
        <p>Pharmacy Owner · Available 24/7</p>
      </div>
      <div id="ducor-chat-status"></div>
      <button id="ducor-chat-close" aria-label="Close chat">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div id="ducor-chat-messages">
      <div class="ducor-msg bot">Hi! I'm Lucas Paye, owner of Ducor International Pharmacy. 👋<br><br>I'm here 24/7 to help you find medications, answer questions about ordering, delivery, and anything about our pharmacy. How can I help you today?</div>
    </div>
    <div id="ducor-chat-typing"><span></span><span></span><span></span></div>
    <div id="ducor-chat-quick">
      <button class="ducor-quick-btn" onclick="ducorChatQuick('What medications do you have?')">Medications</button>
      <button class="ducor-quick-btn" onclick="ducorChatQuick('How do I place an order?')">How to order</button>
      <button class="ducor-quick-btn" onclick="ducorChatQuick('Where are you located?')">Location</button>
      <button class="ducor-quick-btn" onclick="ducorChatQuick('What are your prices?')">Prices</button>
    </div>
    <div id="ducor-chat-input-area">
      <textarea id="ducor-chat-input" rows="1" placeholder="Ask me anything about medications…"></textarea>
      <button id="ducor-chat-send" aria-label="Send">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>`;

  document.body.appendChild(btn);
  document.body.appendChild(win);

  let chatOpen = false;
  let chatHistory = [];

  btn.onclick = toggleChat;
  document.getElementById('ducor-chat-close').onclick = closeChat;
  document.getElementById('ducor-chat-send').onclick = sendMessage;
  document.getElementById('ducor-chat-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
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

  function appendMsg(text, role) {
    const msgs = document.getElementById('ducor-chat-messages');
    const div = document.createElement('div');
    div.className = 'ducor-msg ' + role;
    div.innerHTML = text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  function showTyping() { document.getElementById('ducor-chat-typing').style.display = 'flex'; }
  function hideTyping() { document.getElementById('ducor-chat-typing').style.display = 'none'; }

  async function sendMessage() {
    const input = document.getElementById('ducor-chat-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    if (!chatOpen) openChat();

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
      if (data.reply) {
        appendMsg(data.reply, 'bot');
        chatHistory.push({ role: 'assistant', content: data.reply });
        if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);
      } else {
        appendMsg('Sorry, I\'m having trouble connecting right now. Please <a href="https://wa.me/231880187490" target="_blank">contact us on WhatsApp</a> for immediate help.', 'bot');
      }
    } catch(e) {
      hideTyping();
      appendMsg('I\'m temporarily offline. For urgent help, please <a href="https://wa.me/231880187490" target="_blank">contact us on WhatsApp</a> or call us directly.', 'bot');
    }
  }
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
  // Load products if available
  if (!window.DUCOR_PRODUCTS && typeof products !== 'undefined') {
    window.DUCOR_PRODUCTS = products;
  }
  initSearch();
  initChat();
}

})();
