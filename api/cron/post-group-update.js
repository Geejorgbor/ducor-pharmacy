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

// "Lucas PharMed Consultant whole sell in international medication with Good
// Prices" — the real client group, found via the list_groups diagnostic.
const CLIENT_GROUP_CHAT_ID = '120363425756994007@g.us';

// Real number Lucas asked orders to go through — a tap-to-chat WhatsApp
// link is far less friction for a group member than typing a website URL.
const ORDER_LINE = '📞 Call or WhatsApp to order: wa.me/231888916127 (+231 88 891 6127)';

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

// Several real options per slot so the message doesn't read like the same
// copy-pasted bot text every day — rotates deterministically with the day,
// same as the item picks.
const OPENERS = {
  morning: [
    '🌅 Good morning, PharMed Consultant Liberia family!',
    '🌅 Rise and restock, PharMed family!',
    '🌅 Another day, fresh stock — good morning, partners!',
  ],
  midday: [
    '🕐 Midday Restock Alert — PharMed Consultant Liberia',
    '🕐 Halfway through the day — here’s what’s ready for you:',
    '🕐 Quick midday check-in from PharMed Consultant Liberia:',
  ],
  closing: [
    '🌇 Before We Close — PharMed Consultant Liberia Update',
    '🌇 Last call before we close today:',
    '🌇 Closing time check — don’t miss out before tomorrow:',
  ],
};

const URGENCY_LINES = [
  '🔥 Once it’s gone, it’s gone until our next delivery — don’t wait.',
  '💪 Stock up today and keep your shelves ready for your customers.',
  '🚀 Your customers are asking — be the one who has it in stock.',
  '⚡ Fast-moving stock — reach out now before someone else does.',
];

function pickSlotItems(slot) {
  const seed = dayOfYear();
  const stock = getStockList();
  const third = Math.ceil(stock.length / 3);
  const slotSeeds = { morning: seed, midday: seed + third, closing: seed + third * 2 };
  return pickItems(stock, 6, slotSeeds[slot]);
}

function buildMessage(slot) {
  const seed = dayOfYear();
  const stock = getStockList();
  const third = Math.ceil(stock.length / 3); // spreads the 3 daily slots across different items
  const slotSeeds = { morning: seed, midday: seed + third, closing: seed + third * 2 };

  const items = pickItems(stock, 6, slotSeeds[slot]);
  const opener = OPENERS[slot][seed % OPENERS[slot].length];
  const urgency = URGENCY_LINES[(seed + slotSeeds[slot]) % URGENCY_LINES.length];

  return [
    opener,
    '',
    'Available NOW for your pharmacy, store, or clinic:',
    '',
    formatItems(items),
    '',
    urgency,
    ORDER_LINE,
    '📍 PharMed Consultant Liberia — Monrovia, Liberia 🇱🇷',
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

  try {
    const message = buildMessage(slot);
    const result = await sendWhatsApp(API_URL, ID, TOKEN, message, CLIENT_GROUP_CHAT_ID);
    if (result.ok) {
      try {
        await sleep(IMAGE_GAP_MS);
        result.images = await sendItemImages(API_URL, ID, TOKEN, CLIENT_GROUP_CHAT_ID, pickSlotItems(slot));
      } catch (err) {
        result.images = { ok: false, error: err.message };
      }
    }
    return res.status(200).json(result);
  } catch (err) {
    return res.status(200).json({ ok: false, error: err.message });
  }
};

module.exports._test = { buildMessage, pickSlotItems, imageFileFor, normalizeName };
