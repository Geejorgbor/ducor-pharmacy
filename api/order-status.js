// Vercel serverless function — public guest order tracking (track-order.html).
// Orders are no longer publicly readable in Firestore; this endpoint looks an
// order up server-side (via api/lib/firestore-bridge.js) and returns STATUS
// ONLY — no names, phones, emails, items, notes or tokens.
//
// GET /api/order-status?ref=DUCOR-12345678
// Requires FIREBASE_SERVICE_ACCOUNT_JSON (preferred) or FIREBASE_BRIDGE_EMAIL/PASSWORD.

import { runCollectionQuery, bridgeConfigured } from './lib/firestore-bridge.js';

const ALLOWED_ORIGIN = 'https://ducor-international-pharmacy.com';
const REF_RE = /^DUCOR-[A-Z0-9]{4,20}$/;

export default async function handler(req, res) {
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
