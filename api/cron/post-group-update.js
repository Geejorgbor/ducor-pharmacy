// Vercel serverless function — posts an automatic update to Lucas's real
// WhatsApp client group, 3 times a day (morning / afternoon / evening).
// Content is built from the pharmacy's real product catalog (assets/shop.js)
// and the real live promo codes — nothing here is made up.
//
// Triggered by an external scheduler, not Vercel Cron: this project is on
// Vercel's Hobby plan, which only allows a Cron Job to run once a day.
// See .github/workflows/whatsapp-group-post.yml — it calls this endpoint
// 3x/day at fixed Monrovia times.
//
// SETUP — add this env var in Vercel dashboard → Settings → Environment Variables:
//   GROUP_POST_SECRET = <any random string — must match the same secret
//                         stored as GROUP_POST_SECRET in the GitHub repo's
//                         Actions secrets>
//
// Reuses the same GREEN_API_URL / GREEN_API_ID / GREEN_API_TOKEN env vars
// already set up for api/whatsapp.js.

const { PRODUCTS } = require('../../assets/shop.js');

// "Lucas PharMed Consultant whole sell in international medication with Good
// Prices" — the real client group, found via the list_groups diagnostic.
const CLIENT_GROUP_CHAT_ID = '120363425756994007@g.us';

const SHOP_URL = 'https://ducor-international-pharmacy.com';

async function sendWhatsApp(apiUrl, id, token, message, chatId) {
  const response = await fetch(`${apiUrl}/waInstance${id}/sendMessage/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId, message }),
  });
  const data = await response.json();
  return { ok: response.ok && !!data.idMessage, data };
}

// Picks real items from a real category, deterministically rotating by day
// so the same slot doesn't repeat the same items two days running, without
// needing to store any state between calls.
function pickItems(list, count, seed) {
  const usable = list.filter((p) => !p.adminOnly);
  const picked = [];
  let i = ((seed % usable.length) + usable.length) % usable.length;
  for (let n = 0; n < count && n < usable.length; n++) {
    picked.push(usable[i]);
    i = (i + 7) % usable.length; // step spreads picks across the whole list
  }
  return picked;
}

function dayOfYear() {
  const now = new Date();
  const start = Date.UTC(now.getUTCFullYear(), 0, 0);
  return Math.floor((Date.now() - start) / 86400000);
}

function formatItems(items) {
  return items.map((p) => `  • ${p.name} — $${p.price.toFixed(2)}`).join('\n');
}

function buildMessage(slot) {
  const seed = dayOfYear();

  if (slot === 'morning') {
    const items = pickItems(PRODUCTS.otc, 4, seed);
    return [
      '🌅 Good morning from Ducor International Pharmacy!',
      '',
      'Some of our everyday health essentials:',
      formatItems(items),
      '',
      `🛒 Order online: ${SHOP_URL}/otc.html`,
      '📍 Monrovia, Liberia 🇱🇷',
    ].join('\n');
  }

  if (slot === 'afternoon') {
    const items = pickItems(PRODUCTS.vitamins, 4, seed + 3);
    return [
      '☀️ Ducor Pharmacy — Vitamins & Supplements',
      '',
      formatItems(items),
      '',
      `🌿 Order online: ${SHOP_URL}/vitamins.html`,
      '📍 Monrovia, Liberia 🇱🇷',
    ].join('\n');
  }

  // evening — refill reminder + the two real promo codes
  return [
    '🌆 Ducor International Pharmacy — Evening Update',
    '',
    'Need a prescription refill or new medication? We deliver.',
    `💊 Order online: ${SHOP_URL}/prescription.html`,
    '',
    '🏷️ Current promo codes:',
    '  • SUBSCRIBER40 — 40% off for Subscription Plan clients',
    '  • HOLIDAY15 — 15% off, holiday season',
    '',
    '📍 Monrovia, Liberia 🇱🇷',
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
  if (!['morning', 'afternoon', 'evening'].includes(slot)) {
    return res.status(400).json({ ok: false, error: 'slot must be morning, afternoon, or evening' });
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
    return res.status(200).json(result);
  } catch (err) {
    return res.status(200).json({ ok: false, error: err.message });
  }
};
