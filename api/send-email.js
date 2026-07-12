// Vercel serverless function — sends transactional emails via Resend
// SETUP: Add RESEND_API_KEY to Vercel Environment Variables
// Get your free key at resend.com (free tier = 3,000 emails/month)

const ALLOWED_ORIGIN = 'https://ducor-international-pharmacy.com';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_TYPES = new Set(['order_ready', 'order_confirmed', 'delivery_confirmed']);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const API_KEY = process.env.RESEND_API_KEY;
  if (!API_KEY) return res.status(200).json({ ok: false, error: 'Email not configured — add RESEND_API_KEY to Vercel' });

  const { type, data } = req.body || {};

  if (!type || !ALLOWED_TYPES.has(type)) return res.status(400).json({ ok: false, error: 'Invalid email type' });
  if (!data || typeof data !== 'object') return res.status(400).json({ ok: false, error: 'Missing data' });
  if (!data.buyerEmail || !EMAIL_RE.test(data.buyerEmail)) return res.status(400).json({ ok: false, error: 'Invalid email address' });
  if (!data.ref || typeof data.ref !== 'string' || data.ref.length > 60) return res.status(400).json({ ok: false, error: 'Invalid order ref' });

  try {
    let emailPayload = null;

    // ── Order is ready — email to buyer ──
    if (type === 'order_ready' && data) {
      emailPayload = {
        from: 'Ducor International Pharmacy <orders@ducor-international-pharmacy.com>',
        to: [data.buyerEmail],
        subject: `📦 Your order ${data.ref} is ready for delivery — Ducor International Pharmacy`,
        html: readyEmailHtml(data),
      };
    }

    // ── Order confirmed — email to buyer ──
    if (type === 'order_confirmed' && data) {
      emailPayload = {
        from: 'Ducor International Pharmacy <orders@ducor-international-pharmacy.com>',
        to: [data.buyerEmail],
        subject: `✅ Order Confirmed — ${data.ref} — Ducor International Pharmacy`,
        html: confirmedEmailHtml(data),
      };
    }

    // ── Delivery confirmed — email to buyer ──
    if (type === 'delivery_confirmed' && data) {
      emailPayload = {
        from: 'Ducor International Pharmacy <orders@ducor-international-pharmacy.com>',
        to: [data.buyerEmail],
        subject: `✅ Delivery Confirmed — ${data.ref} — Ducor International Pharmacy`,
        html: deliveredEmailHtml(data),
      };
    }

    if (!emailPayload) return res.status(400).json({ ok: false, error: 'Unknown email type' });

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(emailPayload),
    });
    const result = await r.json();
    return res.status(200).json({ ok: r.ok, result });

  } catch (err) {
    return res.status(200).json({ ok: false, error: err.message });
  }
}

// ── EMAIL TEMPLATES ──────────────────────────────────────────────────────────

function baseLayout(content) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    body{margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Arial,sans-serif}
    .wrap{max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
    .header{background:linear-gradient(135deg,#0d1b2a,#162540);padding:28px 32px;text-align:center}
    .header img{width:56px;height:56px;border-radius:50%;object-fit:cover;border:2px solid rgba(201,160,85,.5);margin-bottom:10px;display:block;margin-left:auto;margin-right:auto}
    .header h1{color:#fff;font-size:20px;font-weight:700;margin:0;letter-spacing:1px}
    .header p{color:#c9a055;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin:4px 0 0}
    .body{padding:32px}
    .badge{display:inline-block;background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;border-radius:20px;padding:6px 16px;font-size:13px;font-weight:700;margin-bottom:20px}
    .order-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin:20px 0}
    .row{display:flex;justify-content:space-between;font-size:13px;padding:5px 0;border-bottom:1px solid #f1f5f9}
    .row:last-child{border-bottom:none}
    .row span{color:#64748b}
    .row strong{color:#0d1b2a;text-align:right}
    .cta{display:block;background:linear-gradient(135deg,#0d1b2a,#162540);color:#c9a055;text-decoration:none;text-align:center;padding:15px 24px;border-radius:12px;font-size:15px;font-weight:700;margin:24px 0}
    .track-btn{display:block;background:#f8fafc;border:1px solid #e2e8f0;color:#0d1b2a;text-decoration:none;text-align:center;padding:13px 24px;border-radius:12px;font-size:14px;font-weight:600;margin-top:12px}
    .footer{background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center;font-size:12px;color:#94a3b8;line-height:1.7}
    .footer a{color:#0d1b2a;text-decoration:none}
    h2{font-size:22px;font-weight:700;color:#0d1b2a;margin:0 0 8px}
    p{font-size:14px;color:#475569;line-height:1.7;margin:0 0 12px}
  </style></head>
  <body><div class="wrap">
    <div class="header">
      <img src="https://ducor-international-pharmacy.com/assets/company-logo.jpg" alt="Ducor"/>
      <h1>DUCOR INTERNATIONAL PHARMACY</h1>
      <p>Monrovia, Liberia</p>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      <strong>Ducor International Pharmacy</strong><br>
      10 &amp; 11 Street, Near Ecobank, Tubman Boulevard, Monrovia, Liberia<br>
      WhatsApp: <a href="https://wa.me/16309366050">+1 (630) 936-6050</a> · <a href="https://wa.me/231880187490">+231 880 187 490</a><br>
      <a href="https://ducor-international-pharmacy.com">ducor-international-pharmacy.com</a>
    </div>
  </div></body></html>`;
}

function itemsTable(items) {
  if (!items || items.length === 0) return '';
  return items.map(i => `<div class="row"><span>${i.name} ×${i.qty}</span><strong>${i.category === 'rx' ? '<span style="color:#0891b2">Pricing by team</span>' : '$' + ((i.price||0)*i.qty).toFixed(2)}</strong></div>`).join('');
}

function readyEmailHtml(d) {
  return baseLayout(`
    <div class="badge">📦 Ready for Delivery</div>
    <h2>Your order is ready!</h2>
    <p>Hello <strong>${d.buyerName || 'Valued Customer'}</strong>,</p>
    <p>Great news — your order from <strong>Ducor International Pharmacy</strong> is packed and <strong>ready for delivery</strong>. Your collector in Liberia will receive it shortly.</p>
    <p>When the order is physically received, please click the button below to confirm delivery:</p>
    <a href="${d.confirmUrl}" class="cta">✅ Confirm I Received My Order</a>
    <div class="order-box">
      <div class="row"><span>Order Ref</span><strong>${d.ref}</strong></div>
      <div class="row"><span>Collector</span><strong>${d.collectorName || '—'} (${d.collectorPhone || '—'})</strong></div>
      ${itemsTable(d.items)}
      <div class="row" style="margin-top:8px;border-top:2px solid #e2e8f0;padding-top:10px"><span><strong>Total</strong></span><strong>$${(d.total||0).toFixed(2)}${d.rxPricesPending ? ' + RX' : ''}</strong></div>
    </div>
    <a href="https://ducor-international-pharmacy.com/track-order.html?ref=${encodeURIComponent(d.ref)}" class="track-btn">📍 Track My Order</a>
    <p style="margin-top:20px;font-size:13px;color:#94a3b8">If you have any questions, reply to this email or WhatsApp us at +1 (630) 936-6050.</p>
  `);
}

function confirmedEmailHtml(d) {
  return baseLayout(`
    <div class="badge">✅ Order Confirmed</div>
    <h2>Thank you for your order!</h2>
    <p>Hello <strong>${d.buyerName || 'Valued Customer'}</strong>,</p>
    <p>We have received your order and our pharmacy team is reviewing it now. You will receive another email when your order is ready for delivery.</p>
    <div class="order-box">
      <div class="row"><span>Order Ref</span><strong>${d.ref}</strong></div>
      <div class="row"><span>Payment</span><strong>${d.paymentMethod || '—'}</strong></div>
      <div class="row"><span>Collector in Liberia</span><strong>${d.collectorName || '—'}</strong></div>
      ${itemsTable(d.items)}
      <div class="row" style="margin-top:8px;border-top:2px solid #e2e8f0;padding-top:10px"><span><strong>Total</strong></span><strong>$${(d.total||0).toFixed(2)}${d.rxPricesPending ? ' + RX TBC' : ''}</strong></div>
    </div>
    <a href="https://ducor-international-pharmacy.com/track-order.html?ref=${encodeURIComponent(d.ref)}" class="cta">📍 Track My Order</a>
    <p style="font-size:13px;color:#94a3b8">Save your order reference number: <strong>${d.ref}</strong>. Use it to track your order at any time.</p>
  `);
}

function deliveredEmailHtml(d) {
  return baseLayout(`
    <div class="badge">🎉 Delivery Confirmed</div>
    <h2>Your order has been delivered!</h2>
    <p>Hello <strong>${d.buyerName || 'Valued Customer'}</strong>,</p>
    <p>Your order from <strong>Ducor International Pharmacy</strong> has been confirmed as received. We hope everything is perfect!</p>
    <div class="order-box">
      <div class="row"><span>Order Ref</span><strong>${d.ref}</strong></div>
      <div class="row"><span>Status</span><strong style="color:#16a34a">✓ Delivered</strong></div>
      <div class="row"><span>Delivered on</span><strong>${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</strong></div>
    </div>
    <p>Thank you so much for choosing Ducor International Pharmacy. We look forward to serving you again!</p>
    <a href="https://ducor-international-pharmacy.com" class="track-btn">🛒 Order Again</a>
  `);
}
