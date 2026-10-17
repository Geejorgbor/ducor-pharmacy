// Vercel serverless function — posts an automatic update to Lucas's real
// wholesale WhatsApp group (pharmacy/medicine store/clinic owners), 3x/day,
// from the pharmacy's real current stock — nothing made up.
//
// Branding note: this group is PharMed Consultant Liberia, the WHOLESALE
// business — separate from Ducor International Pharmacy (the retail
// website). Per Lucas, never brand these messages as "Ducor" — the two are
// unrelated businesses that just happen to share this codebase/phone.
//
// Content comes from WHOLESALE_STOCK_JSON, a plain JSON array of medication
// names that ARE currently in stock (In-Stock + Nimba Stock + Over Stock >
// 0), built once from a real inventory sheet Lucas shared. Per Lucas: only
// ever say an item IS in stock — never the exact quantity, never expiry
// dates. That's why this env var only ever holds names, no numbers.
// To refresh it when stock changes, replace WHOLESALE_STOCK_JSON in Vercel
// (Settings → Environment Variables) with a new JSON array of names.
//
// Triggered by an external scheduler, not Vercel Cron: this project is on
// Vercel's Hobby plan, which only allows a Cron Job to run once a day.
// See .github/workflows/whatsapp-group-post.yml — it calls this endpoint
// 3x/day at fixed Monrovia times: 9AM (opening), 1PM (midday), 5PM
// (closing), per Lucas's real store hours.
//
// SETUP — add these env vars in Vercel dashboard → Settings → Environment Variables:
//   GROUP_POST_SECRET   = <any random string — must match the same secret
//                          stored as GROUP_POST_SECRET in the GitHub repo's
//                          Actions secrets>
//   WHOLESALE_STOCK_JSON = <JSON array of in-stock medication names>
//
// Reuses the same GREEN_API_URL / GREEN_API_ID / GREEN_API_TOKEN env vars
// already set up for api/whatsapp.js.

// The ONLY groups this automation may post to or welcome in (per Lucas,
// 2026-10-17: two groups for now — never any other group this number joins).
// Each group has its own order contact and a fallback display name used when
// Green API getGroupData can't return the group's subject.
//   - "Lucas PharMed Consultant whole sell in international medication with
//     Good Prices" — Lucas's real client group -> Lucas's own number.
//   - "PharMed Consultants medications chatroom" -> +231 77 671 8151.
const GROUPS = [
  {
    chatId: '120363425756994007@g.us',
    fallbackName: 'PharMed Family',
    phoneDisplay: '+231 888 916 127',
    waLink: 'wa.me/231888916127',
  },
  {
    chatId: '120363428569355920@g.us',
    fallbackName: 'PharMed Consultants medications chatroom',
    phoneDisplay: '+231 77 671 8151',
    waLink: 'wa.me/231776718151',
  },
];
const CLIENT_GROUP_CHAT_IDS = GROUPS.map((g) => g.chatId);

function groupConfig(chatId) {
  return GROUPS.find((g) => g.chatId === chatId) || null;
}

// Real group subject from Green API, falling back to the hardcoded name.
// Never throws.
async function fetchGroupName(apiUrl, id, token, chatId) {
  const cfg = groupConfig(chatId);
  const fallback = (cfg && cfg.fallbackName) || 'PharMed Family';
  try {
    const r = await fetch(`${apiUrl}/waInstance${id}/getGroupData/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId: chatId }),
    });
    const data = await r.json();
    const subject = data && typeof data.subject === 'string' ? data.subject.trim() : '';
    return subject || fallback;
  } catch {
    return fallback;
  }
}

function orderLine(chatId) {
  const cfg = groupConfig(chatId) || GROUPS[1];
  return `📲 *Order now:* ${cfg.waLink}  (call/WhatsApp ${cfg.phoneDisplay})`;
}

async function sendWhatsApp(apiUrl, id, token, message, chatId) {
  const response = await fetch(`${apiUrl}/waInstance${id}/sendMessage/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId, message }),
  });
  const data = await response.json();
  return { ok: response.ok && !!data.idMessage, data };
}

// Product photos for the wholesale group post. Each picked item that has a
// real photo is sent right after the text message, captioned with its name.
// Images live in assets/wa-products/ (not referenced by any website page);
// the name -> file map is in _wa-product-images.json (underscore
// prefix so Vercel does not count it as a Serverless Function). Names are matched
// loosely (case, pack-size brackets and punctuation ignored) so small
// differences between WHOLESALE_STOCK_JSON and the sheet still match.
const SITE_BASE = 'https://www.ducor-international-pharmacy.com';
const IMAGE_GAP_MS = 1500;

function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\([^)]*\)?/g, ' ')
    .replace(/[^a-z0-9.%/]+/g, ' ')
    .trim();
}

let productImageIndex = null;
function getProductImageIndex() {
  if (productImageIndex) return productImageIndex;
  productImageIndex = new Map();
  try {
    const map = require('./_wa-product-images.json');
    for (const [name, file] of Object.entries(map)) {
      const key = normalizeName(name);
      if (key && file && !productImageIndex.has(key)) productImageIndex.set(key, file);
    }
  } catch {
    // Missing or broken map: post stays text-only.
  }
  return productImageIndex;
}

function imageFileFor(name) {
  return getProductImageIndex().get(normalizeName(name)) || null;
}

async function sendWhatsAppImage(apiUrl, id, token, chatId, file, caption) {
  const response = await fetch(`${apiUrl}/waInstance${id}/sendFileByUrl/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chatId,
      urlFile: `${SITE_BASE}/assets/wa-products/${file}`,
      fileName: file,
      caption,
    }),
  });
  const data = await response.json();
  return { ok: response.ok && !!data.idMessage, data };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Never throws — an image problem must not affect the text post's result.
async function sendItemImages(apiUrl, id, token, chatId, items) {
  const results = [];
  let first = true;
  for (const name of items) {
    const file = imageFileFor(name);
    if (!file) continue;
    if (!first) await sleep(IMAGE_GAP_MS);
    first = false;
    try {
      const r = await sendWhatsAppImage(apiUrl, id, token, chatId, file, name);
      results.push({ name, ok: r.ok });
    } catch (err) {
      results.push({ name, ok: false, error: err.message });
    }
  }
  return results;
}

function getStockList() {
  try {
    const parsed = JSON.parse(process.env.WHOLESALE_STOCK_JSON || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Picks real in-stock items, deterministically rotating by day so the same
// slot doesn't repeat the same items two days running, without needing to
// store any state between calls.
function pickItems(list, count, seed) {
  if (list.length === 0) return [];
  const picked = [];
  let i = ((seed % list.length) + list.length) % list.length;
  for (let n = 0; n < count && n < list.length; n++) {
    picked.push(list[i]);
    i = (i + 11) % list.length; // step spreads picks across the whole list
  }
  return picked;
}

function dayOfYear() {
  const now = new Date();
  const start = Date.UTC(now.getUTCFullYear(), 0, 0);
  return Math.floor((Date.now() - start) / 86400000);
}

function formatItems(items) {
  return items.map((name) => `  ✅ ${name}`).join('\n');
}

// Rotating copy. Each slot has several headline/intro/closing variants and
// the choice rotates with the day (and slot), so the group doesn't see the
// same bot text twice in a row. Copy rules (per Lucas): no prices, no
// discounts, no medical claims, item names exactly as in stock data.
const HEADLINES = {
  morning: [
    '🚚✨ *NEW SHIPMENT JUST ARRIVED!* ✨🚚',
    '🌅📦 *GOOD MORNING — FRESH STOCK IS IN!* 📦🌅',
    '🔔 *NEW SHIPMENT JUST LANDED — MORE MEDICATIONS NOW IN STOCK!* 🔔',
    '☀️🚚 *RISE & RESTOCK — NEW SHIPMENT JUST ARRIVED!* 🚚☀️',
  ],
  midday: [
    '⚡ *MIDDAY STOCK ALERT — NEW SHIPMENT IN!* ⚡',
    '📦🔥 *MORE MEDICATIONS NOW IN STOCK!* 🔥📦',
    '🕐 *HALF-DAY UPDATE — FRESH ARRIVALS NOW IN STOCK!* 🕐',
    '🚚 *NEW SHIPMENT JUST ARRIVED — MIDDAY EDITION* 🚚',
  ],
  closing: [
    '🌇⏳ *LAST CALL TODAY — NEW STOCK STILL AVAILABLE!* ⏳🌇',
    '🔔 *BEFORE WE CLOSE — NEW SHIPMENT ITEMS IN STOCK!* 🔔',
    '🌆📦 *EVENING UPDATE — MORE MEDICATIONS NOW IN STOCK!* 📦🌆',
    '⏰ *DON’T MISS OUT — NEW SHIPMENT JUST ARRIVED!* ⏰',
  ],
};

const GREETINGS = {
  morning: [
    (g) => `Good morning, *${g}*! 🌞`,
    (g) => `Hello, dear *${g}* family! 👋`,
    (g) => `A bright new day to you, *${g}*! 🌤️`,
  ],
  midday: [
    (g) => `Hey *${g}*, quick midday update for you! 👋`,
    (g) => `Good afternoon, *${g}*! ☀️`,
    (g) => `*${g}* — here’s what’s on our shelves right now 👇`,
  ],
  closing: [
    (g) => `Good evening, *${g}*! 🌙`,
    (g) => `*${g}*, one last update before we close today 👇`,
    (g) => `Evening, dear *${g}* family! ✨`,
  ],
};

const INTROS = [
  'A *new shipment* has just arrived and these medications are *in stock now* for your pharmacy, medicine store or clinic:',
  'Fresh from our *new shipment* — ready for your shelves *today*:',
  'More medications are now *in stock*! Here are some picks from the new arrivals:',
  'Our shelves just got restocked 📦 — these are *available right now*:',
];

const URGENCY_LINES = [
  '🔥 Fast-moving items go quickly — secure yours before they’re gone.',
  '⏳ Stock is limited and moves fast — reserve your order today.',
  '💼 Keep your shelves full so your customers never leave empty-handed.',
  '🚀 Be the first in your area to have these ready for your customers.',
  '✅ Don’t wait for the next delivery — order now while it’s in stock.',
];

const CTAS = {
  morning: [
    '👉 Send us your order list this morning and we’ll get it ready for you.',
    '👉 Message us now — start your day with a full shelf!',
  ],
  midday: [
    '👉 Need something not listed? Just ask — we may have it in stock.',
    '👉 Reply or message us now to reserve your items.',
  ],
  closing: [
    '👉 Message us before closing to have your order ready first thing tomorrow.',
    '👉 Last chance today — send your order now!',
  ],
};

const SIGNOFFS = [
  '🏥 *PharMed Consultant Liberia* — your trusted wholesale partner, Monrovia 🇱🇷',
  '🤝 *PharMed Consultant Liberia* — real stock, reliable service. Monrovia 🇱🇷',
  '💚 *PharMed Consultant Liberia* — growing together with you. Monrovia 🇱🇷',
];

const SLOT_INDEX = { morning: 0, midday: 1, closing: 2 };

function pickSlotItems(slot, seed = dayOfYear()) {
  const stock = getStockList();
  const third = Math.ceil(stock.length / 3);
  const slotSeeds = { morning: seed, midday: seed + third, closing: seed + third * 2 };
  return pickItems(stock, 6, slotSeeds[slot]);
}

const at = (arr, n) => arr[((n % arr.length) + arr.length) % arr.length];

// groupName/chatId personalise the post per group; seed defaults to the day
// of year (overridable for dry-runs).
function buildMessage(slot, { chatId = CLIENT_GROUP_CHAT_IDS[0], groupName, seed = dayOfYear() } = {}) {
  const name = groupName || (groupConfig(chatId) || {}).fallbackName || 'PharMed Family';
  const items = pickSlotItems(slot, seed);
  const n = seed * 3 + SLOT_INDEX[slot]; // advances every slot, every day

  return [
    at(HEADLINES[slot], seed),
    '',
    at(GREETINGS[slot], seed + SLOT_INDEX[slot])(name),
    '',
    at(INTROS, n),
    '',
    formatItems(items),
    '',
    at(URGENCY_LINES, n),
    at(CTAS[slot], seed),
    '',
    orderLine(chatId),
    '',
    at(SIGNOFFS, n),
  ].join('\n');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const secret = req.headers['x-cron-secret'];
  if (!process.env.GROUP_POST_SECRET || secret !== process.env.GROUP_POST_SECRET) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  const slot = (req.body && req.body.slot) || '';
  if (!['morning', 'midday', 'closing'].includes(slot)) {
    return res.status(400).json({ ok: false, error: 'slot must be morning, midday, or closing' });
  }

  const API_URL = process.env.GREEN_API_URL;
  const ID = process.env.GREEN_API_ID;
  const TOKEN = process.env.GREEN_API_TOKEN;
  if (!API_URL || !ID || !TOKEN) {
    return res.status(200).json({ ok: false, error: 'WhatsApp not configured yet' });
  }

  const groups = [];
  for (const chatId of CLIENT_GROUP_CHAT_IDS) {
    let result;
    try {
      const groupName = await fetchGroupName(API_URL, ID, TOKEN, chatId);
      const message = buildMessage(slot, { chatId, groupName });
      result = await sendWhatsApp(API_URL, ID, TOKEN, message, chatId);
      if (result.ok) {
        try {
          await sleep(IMAGE_GAP_MS);
          result.images = await sendItemImages(API_URL, ID, TOKEN, chatId, pickSlotItems(slot));
        } catch (err) {
          result.images = { ok: false, error: err.message };
        }
      }
    } catch (err) {
      result = { ok: false, error: err.message };
    }
    groups.push({ chatId, ...result });
  }
  // Keep top-level shape compatible (first group's result), plus per-group details.
  const first = groups[0] || { ok: false };
  const { chatId: _c, ...firstResult } = first;
  return res.status(200).json({ ...firstResult, ok: groups.some((g) => g.ok), groups });
};

module.exports._test = { buildMessage, pickSlotItems, imageFileFor, normalizeName, orderLine };
// Shared with welcome-new-members.js (same allow-list + contacts).
module.exports.GROUPS = GROUPS;
module.exports.fetchGroupName = fetchGroupName;
