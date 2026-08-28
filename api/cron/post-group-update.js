// Vercel serverless function — posts an automatic update to Lucas's real
// wholesale WhatsApp group (pharmacy/medicine store/clinic owners), morning
// and afternoon, from the pharmacy's real current stock — nothing made up.
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
// 2x/day at fixed Monrovia times (morning + afternoon only — Lucas said a
// 3rd, retail-promo-code message doesn't fit this wholesale group).
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

function buildMessage(slot) {
  const seed = dayOfYear();
  const stock = getStockList();

  if (slot === 'morning') {
    const items = pickItems(stock, 6, seed);
    return [
      '🌅 Good morning, Ducor PharMed family!',
      '',
      'Fresh stock check — these are moving fast, available NOW for your pharmacy, store, or clinic:',
      '',
      formatItems(items),
      '',
      '💪 Stock up today and keep your shelves ready for your customers.',
      `📲 Order here: ${SHOP_URL}`,
      '📍 Ducor International Pharmacy — Monrovia, Liberia 🇱🇷',
    ].join('\n');
  }

  // afternoon (posted near closing time) — different slice of the same
  // real stock list (offset so it doesn't repeat the morning picks)
  const items = pickItems(stock, 6, seed + Math.ceil(stock.length / 2));
  return [
    '🌇 Before We Close — Ducor PharMed Update',
    '',
    'Still available and ready to go for our valued partners:',
    '',
    formatItems(items),
    '',
    '🔥 Don’t let your customers wait — order now while it’s in stock.',
    `📲 Order here: ${SHOP_URL}`,
    '📍 Ducor International Pharmacy — Monrovia, Liberia 🇱🇷',
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
  if (!['morning', 'afternoon'].includes(slot)) {
    return res.status(400).json({ ok: false, error: 'slot must be morning or afternoon' });
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
