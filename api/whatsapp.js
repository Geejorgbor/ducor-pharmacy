// Vercel serverless function — sends WhatsApp notifications via Green API
// Handles: new order alerts + delivery confirmation alerts to the boss
//
// SETUP — add these 3 env vars in Vercel dashboard → Settings → Environment Variables:
//   GREEN_API_URL   = https://7107.api.greenapi.com
//   GREEN_API_ID    = 7107656793
//   GREEN_API_TOKEN = <apiTokenInstance from your Green API dashboard>

const BOSS_CHAT_ID = '231887221275@c.us'; // Boss WhatsApp in international format

async function sendWhatsApp(apiUrl, id, token, message) {
  const response = await fetch(
    `${apiUrl}/waInstance${id}/sendMessage/${token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: BOSS_CHAT_ID, message }),
    }
  );
  const data = await response.json();
  return { ok: response.ok && !!data.idMessage, data };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const API_URL = process.env.GREEN_API_URL;
  const ID      = process.env.GREEN_API_ID;
  const TOKEN   = process.env.GREEN_API_TOKEN;

  if (!API_URL || !ID || !TOKEN) {
    return res.status(200).json({ ok: false, error: 'WhatsApp not configured yet' });
  }

  const { order, type, delivery } = req.body || {};

  try {
    // ── Delivery confirmed by customer ──
    if (type === 'delivery_confirmed' && delivery) {
      const message = [
        '✅ DELIVERY CONFIRMED — Ducor Pharmacy',
        '',
        `📋 Order: #${(delivery.orderId || '').slice(-8).toUpperCase()}`,
        `👤 Customer: ${delivery.customerName || '—'}`,
        `📞 Phone: ${delivery.customerPhone || '—'}`,
        `💵 Total: $${delivery.total || '—'}`,
        '',
        '🎉 Customer confirmed they received their order.',
        `⏰ Confirmed at: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Monrovia' })}`,
      ].join('\n');

      const result = await sendWhatsApp(API_URL, ID, TOKEN, message);
      return res.status(200).json(result);
    }

    // ── New order placed ──
    if (!order) {
      return res.status(400).json({ ok: false, error: 'No order or delivery data' });
    }

    const items = (order.items || [])
      .map(i => `  • ${i.name} ×${i.qty}${i.category === 'rx' ? ' (RX — price to be confirmed)' : ' — $' + ((i.price || 0) * i.qty).toFixed(2)}`)
      .join('\n');

    const patientLine = order.orderingFor === 'other' && order.patientName
      ? `\n👥 For: ${order.patientName} (${order.patientRelationship || 'relative'})${order.patientPhone ? ' — ' + order.patientPhone : ''}`
      : '';

    const rxFlag = order.rxPricesPending ? '\n⚠️  RX ORDER — Contact customer for pricing' : '';

    const message = [
      '🛒 NEW ORDER — Ducor International Pharmacy',
      '━━━━━━━━━━━━━━━━━━━━━━━━',
      `📋 Ref: ${order.ref}`,
      `👤 Customer: ${order.buyerName}`,
      `📧 ${order.buyerEmail}`,
      `📞 ${order.buyerPhone}`,
      `🌍 Country: ${order.buyerCountry}${patientLine}`,
      '',
      `📦 Items:\n${items}`,
      '',
      order.subtotal > 0 ? `💰 OTC Subtotal: $${(order.subtotal || 0).toFixed(2)}` : '',
      order.discount > 0 ? `🏷️  Discount: -$${order.discount.toFixed(2)} (${order.promoCode})` : '',
      `💵 Total: $${(order.total || 0).toFixed(2)}${order.rxPricesPending ? ' + RX (TBC)' : ''}`,
      `💳 Payment: ${order.paymentMethod} (${order.paymentStatus})`,
      '',
      `🏪 Collector: ${order.pickupName}`,
      `📱 Collector Phone: ${order.pickupPhone}`,
      order.notes ? `📝 Notes: ${order.notes}` : '',
      rxFlag,
      '',
      '👉 View in dashboard: ducor-international-pharmacy.com/dashboard.html',
    ].filter(Boolean).join('\n');

    const result = await sendWhatsApp(API_URL, ID, TOKEN, message);
    return res.status(200).json(result);

  } catch (err) {
    return res.status(200).json({ ok: false, error: err.message });
  }
}
