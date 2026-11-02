// Server-side order pricing. Prices come from the deployed /assets/shop.js
// (the same file the shop and the admin dashboard's product publishing use),
// so there is a single price list and nothing to keep in sync by hand.

export const DELIVERY_FEE = 8;
export const FREE_DELIVERY_THRESHOLD = 200;
const PROD_ORIGIN = 'https://www.ducor-international-pharmacy.com';

let _cache = null;
let _cacheAt = 0;

/** Parse PRODUCTS + the DIP plan price out of shop.js source text. */
export function parseCatalog(src) {
  const start = src.indexOf('const PRODUCTS = {');
  const end = src.indexOf('\n};', start);
  if (start < 0 || end < 0) throw new Error('catalog not found');
  const block = src.slice(start, end);
  const catalog = {};
  let section = null;
  for (const line of block.split('\n')) {
    const sec = line.match(/^\s{2}([a-z]+):\s*\[/);
    if (sec) { section = sec[1]; continue; }
    const m = line.match(/\{\s*id:\s*'([^']+)'.*?price:\s*([0-9]+(?:\.[0-9]+)?)/);
    if (m && section) {
      catalog[m[1]] = { price: Number(m[2]), category: section === 'prescription' ? 'rx' : section };
    }
  }
  const plan = src.match(/id:\s*'dip-plan'[\s\S]{0,200}?price:\s*([0-9]+(?:\.[0-9]+)?)/);
  if (plan) catalog['dip-plan'] = { price: Number(plan[1]), category: 'plan' };
  if (Object.keys(catalog).length < 10) throw new Error('catalog too small');
  return catalog;
}

export async function loadCatalog() {
  if (_cache && Date.now() - _cacheAt < 5 * 60 * 1000) return _cache;
  const origins = [];
  if (process.env.VERCEL_URL) origins.push('https://' + process.env.VERCEL_URL);
  origins.push(PROD_ORIGIN);
  let lastErr;
  for (const o of origins) {
    try {
      const r = await fetch(o + '/assets/shop.js', { cache: 'no-store' });
      if (!r.ok) throw new Error('shop.js ' + r.status);
      _cache = parseCatalog(await r.text());
      _cacheAt = Date.now();
      return _cache;
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('catalog unavailable');
}

const r2 = (n) => Math.round(n * 100) / 100;

/**
 * @param {{items:Array<{id:string,qty:number}>, promo?:object|null, deliveryMethod?:string, subscriberActive?:boolean}} input
 * Prescription lines are priced by the pharmacist later (excluded, as before).
 */
export function computeTotals({ items, promo, deliveryMethod, subscriberActive }, catalog) {
  let otcSub = 0, planSub = 0, hasRx = false;
  const unknown = [];
  const lines = [];
  for (const it of Array.isArray(items) ? items.slice(0, 100) : []) {
    const id = String(it?.id || '');
    const qty = Math.max(1, Math.min(99, parseInt(it?.qty, 10) || 1));
    const c = catalog[id];
    if (!c) { unknown.push(id); continue; }
    if (c.category === 'rx') { hasRx = true; lines.push({ id, qty, price: null }); continue; }
    if (c.category === 'plan') { planSub += c.price; lines.push({ id, qty: 1, price: c.price }); continue; }
    otcSub += c.price * qty;
    lines.push({ id, qty, price: c.price });
  }
  otcSub = r2(otcSub); planSub = r2(planSub);
  let discount = 0;
  let promoApplied = null;
  let promoRejected = null;
  if (promo) {
    if (promo.subscriberOnly && (planSub > 0 || !subscriberActive)) {
      promoRejected = planSub > 0 ? 'plan_purchase' : 'not_subscriber';
    } else if (promo.type === 'percent') {
      discount = r2(otcSub * Math.min(100, Number(promo.value)) / 100); promoApplied = promo.code;
    } else {
      discount = r2(Math.min(Number(promo.value), otcSub)); promoApplied = promo.code;
    }
  }
  const shipping = deliveryMethod === 'delivery' && otcSub < FREE_DELIVERY_THRESHOLD ? DELIVERY_FEE : 0;
  const total = r2(otcSub + planSub - discount + shipping);
  return { lines, otcSub, planSub, subtotal: r2(otcSub + planSub), discount, shipping, total, hasRx, unknown, promoApplied, promoRejected };
}
