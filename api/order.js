// Vercel serverless function — guest order endpoints (single function to stay
// under the Hobby plan's 12-function limit).
//   GET  /api/order?action=status&ref=DUCOR-12345678   → status fields only
//   POST /api/order?action=confirm-delivery  {order, token}
//        → token checked server-side; writes only confirmedByCustomer + deliveredAt
// Requires FIREBASE_SERVICE_ACCOUNT_JSON (preferred) or FIREBASE_BRIDGE_EMAIL/PASSWORD.

import crypto from 'crypto';
import { runCollectionQuery, getDocument, patchDocument, bridgeConfigured } from '../lib/firestore-bridge.js';

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
