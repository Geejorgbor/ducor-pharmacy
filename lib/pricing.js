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
  // Part-pack amounts: "<id>-p<size>" priced from PART_PACK. Full packs use the base product id.
  // The server only accepts listed amounts and uses the list price, never the client's figure.
  const pb = src.indexOf('const PART_PACK = {');
  if (pb >= 0) {
    const pe = src.indexOf('\n};', pb);
    let current = null;
    const packMap = {};
    for (const line of src.slice(pb, pe).split('\n')) {
      const idm = line.match(/^\s*'?([a-z0-9]+)'?:\s*\[/);
      if (idm) current = idm[1];
      if (!current || !catalog[current]) continue;
      if (!packMap[current]) packMap[current] = [];
      for (const m of line.matchAll(/\{\s*size:\s*(\d+),\s*price:\s*([0-9]+(?:\.[0-9]+)?)[^}]*?\}/g)) {
        const isPack = /pack:\s*true/.test(m[0]);
        const opt = { size: Number(m[1]), price: Number(m[2]), pack: !!isPack };
        packMap[current].push(opt);
        if (!isPack) {
          catalog[current + '-p' + m[1]] = { price: opt.price, category: catalog[current].category, packSize: opt.size, parentId: current };
        }
      }
    }
    for (const id of Object.keys(packMap)) {
      catalog[id].packOptions = packMap[id];
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
 * Can `total` tablets be sold as k full packs plus 0 or 1 allowed part?
 * @param {number} total
 * @param {Array<{size:number,price:number,pack?:boolean}>} options
 */
export function splitTabletTotal(total, options) {
  const n = Number(total);
  if (!options || !options.length || !Number.isInteger(n) || n < 1) return null;
  const pack = options.find((o) => o.pack);
  const partSizes = options.filter((o) => !o.pack).map((o) => o.size);
  const packSize = pack ? pack.size : 0;
  if (packSize > 0) {
    const packs = Math.floor(n / packSize);
    const rem = n - packs * packSize;
    if (rem === 0) return { packs, part: 0 };
    if (partSizes.includes(rem)) return { packs, part: rem };
    return null;
  }
  if (partSizes.includes(n)) return { packs: 0, part: n };
  return null;
}

function parentProductId(sku) {
  const m = String(sku || '').match(/^(.*)-p(\d+)$/);
  return m ? m[1] : sku;
}

/**
 * @param {{items:Array<{id:string,qty:number}>, promo?:object|null, deliveryMethod?:string, subscriberActive?:boolean}} input
 * Prescription lines are priced by the pharmacist later (excluded, as before).
 */
export function computeTotals({ items, promo, deliveryMethod, subscriberActive }, catalog) {
  let otcSub = 0, planSub = 0, hasRx = false;
  const unknown = [];
  const invalidAmounts = [];
  const lines = [];
  const groups = {};
  const passthrough = [];
  for (const it of Array.isArray(items) ? items.slice(0, 100) : []) {
    const id = String(it?.id || '');
    const qty = Math.max(1, Math.min(99, parseInt(it?.qty, 10) || 1));
    const parentId = parentProductId(id);
    const parent = catalog[parentId];
    if (parent && parent.packOptions) {
      if (!catalog[id]) { unknown.push(id); continue; }
      if (!groups[parentId]) groups[parentId] = { items: [], options: parent.packOptions, category: parent.category };
      groups[parentId].items.push({ id, qty });
      continue;
    }
    const c = catalog[id];
    if (!c) { unknown.push(id); continue; }
    passthrough.push({ id, qty, c });
  }
  for (const { id, qty, c } of passthrough) {
    if (c.category === 'rx') { hasRx = true; lines.push({ id, qty, price: null }); continue; }
    if (c.category === 'plan') { planSub += c.price; lines.push({ id, qty: 1, price: c.price }); continue; }
    otcSub += c.price * qty;
    lines.push({ id, qty, price: c.price });
  }
  for (const parentId of Object.keys(groups)) {
    const g = groups[parentId];
    const packOpt = g.options.find((o) => o.pack);
    let totalTablets = 0;
    let validLines = true;
    for (const line of g.items) {
      let size = 0;
      if (line.id === parentId) size = packOpt ? packOpt.size : 0;
      else {
        const m = String(line.id).match(/-p(\d+)$/);
        size = m ? Number(m[1]) : 0;
      }
      if (!size) { validLines = false; break; }
      totalTablets += size * line.qty;
    }
    const split = validLines ? splitTabletTotal(totalTablets, g.options) : null;
    if (!split) {
      invalidAmounts.push(parentId);
      continue;
    }
    if (g.category === 'rx') {
      hasRx = true;
      if (split.packs > 0) lines.push({ id: parentId, qty: split.packs, price: null });
      if (split.part > 0) lines.push({ id: parentId + '-p' + split.part, qty: 1, price: null });
      continue;
    }
    if (split.packs > 0 && packOpt) {
      otcSub += packOpt.price * split.packs;
      lines.push({ id: parentId, qty: split.packs, price: packOpt.price });
    }
    if (split.part > 0) {
      const partOpt = g.options.find((o) => !o.pack && o.size === split.part);
      if (!partOpt) { invalidAmounts.push(parentId); continue; }
      otcSub += partOpt.price;
      lines.push({ id: parentId + '-p' + split.part, qty: 1, price: partOpt.price });
    }
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
  return { lines, otcSub, planSub, subtotal: r2(otcSub + planSub), discount, shipping, total, hasRx, unknown, invalidAmounts, promoApplied, promoRejected };
}
