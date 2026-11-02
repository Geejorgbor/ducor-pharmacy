// Vercel serverless function — guest order endpoints (single function to stay
// under the Hobby plan's 12-function limit).
//   GET  /api/order?action=status&ref=DUCOR-12345678   → status fields only
//   POST /api/order?action=confirm-delivery  {order, token}
//        → token checked server-side; writes only confirmedByCustomer + deliveredAt
//   POST /api/order?action=promo     {code}  (+ optional Bearer ID token)
//        → validates a promo; subscriber-only codes need an active DIP plan,
//          checked here against paid orders (not the browser's copy)
//   POST /api/order?action=finalize  {orderId}  (+ Bearer ID token)
//        → recomputes the new order's totals from the server price list and
//          overwrites subtotal/discount/shipping/total (client figure kept
//          as clientTotal; totalMismatch flags any difference)
//   GET  /api/order?action=promo-list  (admin Bearer only) → current codes
// Requires FIREBASE_SERVICE_ACCOUNT_JSON (preferred) or FIREBASE_BRIDGE_EMAIL/PASSWORD.

import crypto from 'crypto';
import { runCollectionQuery, getDocument, patchDocument, bridgeConfigured, getAdminState } from '../lib/firestore-bridge.js';
import { verifyUserBearer, verifyAdminBearer } from '../lib/verify-admin.js';
import { loadCatalog, computeTotals } from '../lib/pricing.js';

const ALLOWED_ORIGIN = 'https://ducor-international-pharmacy.com';
const REF_RE = /^DUCOR-[A-Z0-9]{4,20}$/;
const ID_RE = /^[A-Za-z0-9_-]{6,64}$/;
const TOKEN_RE = /^[A-Za-z0-9_-]{8,128}$/;

function safeEqual(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
}

export default async function handler(req, res) {
  const action = String(req.query?.action || '');
  if (action === 'status') return statusHandler(req, res);
  if (action === 'confirm-delivery') return confirmHandler(req, res);
  if (action === 'promo') return promoHandler(req, res);
  if (action === 'finalize') return finalizeHandler(req, res);
  if (action === 'promo-list') return promoListHandler(req, res);
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  if (req.method === 'OPTIONS') return res.status(200).end();
  return res.status(400).json({ ok: false, error: 'Unknown action' });
}

async function statusHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false });

  if (!bridgeConfigured()) {
    return res.status(503).json({ ok: false, error: 'Tracking not configured' });
  }

  let ref = String(req.query?.ref || '').trim().toUpperCase();
  if (ref && !ref.startsWith('DUCOR-')) ref = 'DUCOR-' + ref;
  if (!REF_RE.test(ref)) return res.status(400).json({ ok: false, error: 'Invalid order reference' });

  try {
    const rows = await runCollectionQuery('orders', { whereEqual: { field: 'ref', value: ref }, limit: 1 });
    const o = rows[0];
    if (!o) return res.status(404).json({ ok: false, error: 'Order not found' });
    return res.status(200).json({
      ok: true,
      order: {
        ref: o.ref || ref,
        status: String(o.status || 'new').toLowerCase(),
        paymentConfirmed: !!o.paymentConfirmed,
        createdAt: o.createdAt || null,
        deliveredAt: o.deliveredAt || null,
      },
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Lookup failed' });
  }
}

async function confirmHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  if (!bridgeConfigured()) return res.status(503).json({ ok: false, error: 'Not configured' });

  const { order, token } = req.body || {};
  if (!ID_RE.test(String(order || '')) || !TOKEN_RE.test(String(token || ''))) {
    return res.status(400).json({ ok: false, error: 'Invalid link' });
  }

  let o;
  try {
    o = await getDocument(`orders/${order}`);
  } catch (_) {
    o = null;
  }
  // Same response for "no such order" and "wrong token" — no enumeration.
  if (!o || !safeEqual(o.confirmToken, token)) {
    return res.status(403).json({ ok: false, error: 'This confirmation link is not valid' });
  }

  const info = {
    ref: o.ref || String(order).slice(-8).toUpperCase(),
    firstName: String(o.firstName || (o.buyerName || '').split(' ')[0] || '').slice(0, 40),
  };
  if (o.confirmedByCustomer) return res.status(200).json({ ok: true, already: true, ...info });

  try {
    await patchDocument(`orders/${order}`, {
      confirmedByCustomer: true,
      deliveredAt: o.deliveredAt || new Date().toISOString(),
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Could not confirm' });
  }
  return res.status(200).json({ ok: true, already: false, ...info });
}

// ── Promo validation (server-side; codes are no longer shipped in page source) ──
// Codes can be overridden with PROMO_CODES_JSON env var, e.g.
// {"CODE":{"type":"percent","value":10,"label":"..."}}; otherwise the existing
// built-in codes are used so behaviour is unchanged.
const DEFAULT_PROMOS = {
  SUBSCRIBER40: { type: 'percent', value: 40, label: '40% off for Subscription Plan clients', subscriberOnly: true },
  HOLIDAY15: { type: 'percent', value: 15, label: '15% off for the holiday season' },
};
const SUBSCRIBER_ONLY = new Set(['SUBSCRIBER40']);

function normPromo(code, p) {
  if (!p || p._removed) return null;
  const type = p.type === 'flat' ? 'fixed' : p.type;
  const value = Number(p.value);
  if (!(type === 'percent' || type === 'fixed') || !(value > 0)) return null;
  return {
    code, type,
    value: Math.min(value, type === 'percent' ? 100 : 100000),
    label: String(p.label || (type === 'percent' ? `${value}% off` : `$${value} off`)),
    subscriberOnly: !!p.subscriberOnly || SUBSCRIBER_ONLY.has(code),
  };
}

// Built-ins (or PROMO_CODES_JSON) merged with the codes the admin manages
// from the dashboard (admin_state/promos in Firestore, admin-only).
async function promoTable() {
  let base = DEFAULT_PROMOS;
  try {
    const raw = process.env.PROMO_CODES_JSON;
    if (raw) { const t = JSON.parse(raw); if (t && typeof t === 'object') base = t; }
  } catch (e) { /* fall back */ }
  const merged = { ...base };
  if (bridgeConfigured()) {
    try {
      const dyn = await getAdminState('promos');
      if (dyn && typeof dyn === 'object') {
        for (const [k, v] of Object.entries(dyn)) {
          const code = String(k).toUpperCase();
          if (v && v._removed) delete merged[code]; else merged[code] = v;
        }
      }
    } catch (e) { /* built-ins still work */ }
  }
  return merged;
}
async function findPromo(code) {
  if (!/^[A-Z0-9]{3,32}$/.test(code)) return null;
  const t = await promoTable();
  return normPromo(code, t[code]);
}

// Active DIP member = a paid (or admin-activated) subscription order for this
// email within the last 12 months. Same rule account.html uses for display.
async function isActiveSubscriber(email) {
  if (!email || !bridgeConfigured()) return false;
  try {
    const rows = await runCollectionQuery('orders', { whereEqual: { field: 'buyerEmail', value: email }, limit: 50 });
    return rows.some((o) => {
      if (!o.isSubscription) return false;
      if (!(o.paymentConfirmed || o.subscriptionStatus === 'active')) return false;
      const start = new Date(o.subscriptionActivatedAt || o.paymentConfirmedAt || o.createdAt || 0);
      const end = new Date(start.getTime()); end.setFullYear(end.getFullYear() + 1);
      return end.getTime() > Date.now();
    });
  } catch (e) { return false; }
}

function cors(res, methods) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', methods + ', OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Cache-Control', 'no-store');
}

async function promoHandler(req, res) {
  cors(res, 'POST');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  const body = typeof req.body === 'string' ? safeJson(req.body) : (req.body || {});
  const code = String(body.code || '').trim().toUpperCase();
  const p = await findPromo(code);
  if (!p) return res.status(200).json({ ok: false, error: 'invalid' });
  if (p.subscriberOnly) {
    const u = await verifyUserBearer(req);
    if (!u.ok) return res.status(200).json({ ok: false, error: 'sign_in_required' });
    if (!(await isActiveSubscriber(u.email))) return res.status(200).json({ ok: false, error: 'not_subscriber' });
  }
  return res.status(200).json({ ok: true, promo: { code: p.code, type: p.type, value: p.value, label: p.label, subscriberOnly: p.subscriberOnly } });
}

async function finalizeHandler(req, res) {
  cors(res, 'POST');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  if (!bridgeConfigured()) return res.status(503).json({ ok: false, error: 'Not configured' });
  const body = typeof req.body === 'string' ? safeJson(req.body) : (req.body || {});
  const orderId = String(body.orderId || '');
  if (!ID_RE.test(orderId)) return res.status(400).json({ ok: false, error: 'Invalid order' });

  let o;
  try { o = await getDocument(`orders/${orderId}`); } catch (_) { o = null; }
  if (!o) return res.status(404).json({ ok: false, error: 'Order not found' });
  // Already priced by the server: return the stored figures (idempotent).
  if (o.totalsVerified) {
    return res.status(200).json({ ok: true, totals: { subtotal: o.subtotal, discount: o.discount, shipping: o.shipping, total: o.total } });
  }
  const created = Date.parse(o.createdAt || '');
  if (!created || Date.now() - created > 60 * 60 * 1000) {
    return res.status(409).json({ ok: false, error: 'Order too old to finalize' });
  }

  const u = await verifyUserBearer(req);
  const buyer = String(o.buyerEmail || '').trim().toLowerCase();
  let promo = null;
  if (o.promoCode) promo = await findPromo(String(o.promoCode).toUpperCase());
  const subscriberActive = !!(promo && promo.subscriberOnly && u.ok && u.email === buyer && (await isActiveSubscriber(buyer)));

  let t;
  try {
    const catalog = await loadCatalog();
    t = computeTotals({ items: o.items, promo, deliveryMethod: o.deliveryMethod, subscriberActive }, catalog);
  } catch (e) {
    return res.status(503).json({ ok: false, error: 'Pricing unavailable' });
  }
  const clientTotal = Number(o.total);
  const patch = {
    subtotal: t.subtotal,
    discount: t.discount,
    shipping: t.shipping,
    total: t.total,
    promoCode: t.promoApplied,
    clientTotal: Number.isFinite(clientTotal) ? clientTotal : null,
    totalMismatch: !Number.isFinite(clientTotal) || Math.abs(clientTotal - t.total) > 0.009,
    unknownItems: t.unknown,
    totalsVerified: true,
    totalsVerifiedAt: new Date().toISOString(),
  };
  if (t.promoRejected) patch.promoRejected = t.promoRejected;
  try { await patchDocument(`orders/${orderId}`, patch); } catch (e) {
    return res.status(500).json({ ok: false, error: 'Could not save totals' });
  }
  return res.status(200).json({ ok: true, totals: { subtotal: t.subtotal, discount: t.discount, shipping: t.shipping, total: t.total }, promoRejected: t.promoRejected || null });
}

async function promoListHandler(req, res) {
  cors(res, 'GET');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false });
  const a = await verifyAdminBearer(req);
  if (!a.ok) return res.status(a.status || 401).json({ ok: false, error: 'Forbidden' });
  const t = await promoTable();
  const list = Object.keys(t).map((c) => normPromo(c, t[c])).filter(Boolean);
  return res.status(200).json({ ok: true, promos: list });
}
function safeJson(t) { try { return JSON.parse(t); } catch (e) { return {}; } }
