// Vercel serverless function — sends WhatsApp order notification via Green API
// Credentials stay server-side, never exposed to browser
//
// SETUP — add these 3 env vars in Vercel dashboard → Settings → Environment Variables:
//   GREEN_API_URL   = https://7107.api.greenapi.com   (the apiUrl shown in your instance dashboard)
//   GREEN_API_ID    = 7107656793                       (idInstance from dashboard)
//   GREEN_API_TOKEN = <click the eye icon next to apiTokenInstance and copy it>

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const API_URL = process.env.GREEN_API_URL;
  const ID      = process.env.GREEN_API_ID;
  const TOKEN   = process.env.GREEN_API_TOKEN;

  if (!API_URL || !ID || !TOKEN) {
    // Not yet configured — return ok so checkout doesn't break
    return res.status(200).json({ ok: false, error: 'WhatsApp not configured yet' });
  }

  const { order } = req.body || {};
  if (!order) {
    return res.status(400).json({ ok: false, error: 'No order data' });
  }

  try {
    const items = (order.items || [])
      .map(i => `  • ${i.name} x${i.qty}${i.category === 'rx' ? ' (RX - price at pickup)' : ' — $' + ((i.price || 0) * i.qty).toFixed(2)}`)
      .join('\n');

    const patientLine = order.orderingFor === 'other' && order.patientName
      ? `\n👥 For patient: ${order.patientName} (${order.patientRelationship || 'relative'})${order.patientPhone ? ' — ' + order.patientPhone : ''}`
      : '';

    const rxFlag = order.hasRx ? '\n\n⚠️ RX ORDER — Prescription required' : '';

    const message = [
      '🛒 NEW ORDER — Ducor Pharmacy',
      '',
      `📋 Ref: ${order.ref}`,
      `👤 Customer: ${order.buyerName}`,
      `📧 ${order.buyerEmail}`,
      `📞 ${order.buyerPhone}`,
      `🌍 Country: ${order.buyerCountry}${patientLine}`,
      '',
      `📦 Items:\n${items}`,
      '',
      `💰 Subtotal: $${(order.subtotal || 0).toFixed(2)}`,
      `🚚 Shipping: $${(order.shipping || 0).toFixed(2)}`,
      `💵 TOTAL: $${(order.total || 0).toFixed(2)}`,
      `💳 Payment: ${order.paymentMethod} (${order.paymentStatus})`,
      '',
      `🏪 Pickup: ${order.pickupName}`,
      `📱 Phone: ${order.pickupPhone}`,
      order.notes ? `📝 Notes: ${order.notes}` : '',
      rxFlag
    ].filter(Boolean).join('\n');

    // Boss WhatsApp — international format without + followed by @c.us
    const BOSS_CHAT_ID = '231887221275@c.us';

    const response = await fetch(
      `${API_URL}/waInstance${ID}/sendMessage/${TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: BOSS_CHAT_ID, message }),
      }
    );

    const data = await response.json();

    if (response.ok && data.idMessage) {
      return res.status(200).json({ ok: true, messageId: data.idMessage });
    } else {
      return res.status(200).json({ ok: false, error: data });
    }
  } catch (err) {
    return res.status(200).json({ ok: false, error: err.message });
  }
}
