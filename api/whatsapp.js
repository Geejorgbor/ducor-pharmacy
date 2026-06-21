// Vercel serverless function — sends WhatsApp notifications via Green API
// Handles: new order alerts + delivery confirmation alerts to the boss
//
// SETUP — add these 3 env vars in Vercel dashboard → Settings → Environment Variables:
//   GREEN_API_URL   = https://7107.api.greenapi.com
//   GREEN_API_ID    = 7107656793
//   GREEN_API_TOKEN = <apiTokenInstance from your Green API dashboard>

const BOSS_CHAT_ID = '231887221275@c.us'; // Boss WhatsApp in international format

async function sendWhatsApp(apiUrl, id, token, message, chatId = BOSS_CHAT_ID) {
  const response = await fetch(
    `${apiUrl}/waInstance${id}/sendMessage/${token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, message }),
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

    // ── Ready for delivery — send to BUYER WhatsApp + COLLECTOR WhatsApp + email ──
    if (type === 'customer_ready' && req.body.customerOrder) {
      const co = req.body.customerOrder;

      function toWaChatId(phone) {
        const raw = (phone || '').replace(/[\s\-\(\)\+]/g, '');
        return raw ? raw + '@c.us' : null;
      }

      // Message to COLLECTOR in Liberia — they physically receive it and tap to confirm
      const collectorMsg = [
        `Hello ${co.collectorName || 'Collector'}! 👋`,
        ``,
        `The order for *${co.customerName || 'the customer'}* from *Ducor International Pharmacy* is *ready for delivery*! 📦`,
        ``,
        `📋 Order Ref: ${co.ref}`,
        `📦 Items: ${co.items || '—'}`,
        ``,
        `When you *physically receive* the package, please tap the link below to confirm:`,
        ``,
        co.confirmUrl,
        ``,
        `Thank you! — Ducor International Pharmacy, Monrovia, Liberia 🇱🇷`,
      ].join('\n');

      // Message to BUYER — they placed the order and want to know status
      const buyerMsg = [
        `Hello ${co.customerName || 'Valued Customer'}! 👋`,
        ``,
        `Great news! Your order from *Ducor International Pharmacy* is *ready and on its way*! 🎉`,
        ``,
        `📋 Order Ref: ${co.ref}`,
        `📦 Items: ${co.items || '—'}`,
        ``,
        `Your collector in Liberia (*${co.collectorName || 'the collector'}*) has been notified to confirm receipt.`,
        ``,
        `You can also tap the link below to confirm delivery yourself:`,
        ``,
        co.confirmUrl,
        ``,
        `Track your order anytime: https://ducor-international-pharmacy.com/track-order.html?ref=${encodeURIComponent(co.ref)}`,
        ``,
        `Thank you for choosing Ducor International Pharmacy. We appreciate your trust! 🙏`,
      ].join('\n');

      const results = [];

      // Send to collector phone (Liberia)
      const collectorChatId = toWaChatId(co.collectorPhone);
      if (collectorChatId) {
        try { results.push(await sendWhatsApp(API_URL, ID, TOKEN, collectorMsg, collectorChatId)); } catch(e) {}
      }

      // Send to buyer phone
      const buyerChatId = toWaChatId(co.customerPhone);
      if (buyerChatId && buyerChatId !== collectorChatId) {
        try { results.push(await sendWhatsApp(API_URL, ID, TOKEN, buyerMsg, buyerChatId)); } catch(e) {}
      }

      return res.status(200).json({ ok: true, results });
    }

    // ── Payment confirmed by boss ──
    if (type === 'payment_confirmed' && delivery) {
      const message = [
        '💳 PAYMENT CONFIRMED — Ducor Pharmacy',
        '',
        `📋 Order: ${delivery.ref || '—'}`,
        `👤 Customer: ${delivery.customerName || '—'}`,
        `📞 Phone: ${delivery.customerPhone || '—'}`,
        `💵 Amount: $${delivery.total || '—'}`,
        `💳 Method: ${delivery.paymentMethod || '—'}`,
        '',
        '✅ Payment marked as received. Order is now Processing.',
        `⏰ ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Monrovia' })}`,
      ].join('\n');
      const result = await sendWhatsApp(API_URL, ID, TOKEN, message);
      return res.status(200).json(result);
    }

    // ── Order status changed ──
    if (type === 'status_update' && delivery) {
      const statusEmoji = { processing:'⚙️', ready:'📦', delivered:'✅', cancelled:'❌' };
      const emoji = statusEmoji[delivery.newStatus] || '🔄';
      const message = [
        `${emoji} ORDER STATUS UPDATE — Ducor Pharmacy`,
        '',
        `📋 Order: ${delivery.ref || delivery.orderId || '—'}`,
        `👤 Customer: ${delivery.customerName || '—'}`,
        `📞 Phone: ${delivery.customerPhone || '—'}`,
        `🔄 Status: ${(delivery.prevStatus||'—').toUpperCase()} → ${(delivery.newStatus||'—').toUpperCase()}`,
        `⏰ ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Monrovia' })}`,
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

    const confirmPayUrl = `https://ducor-international-pharmacy.com/confirm-payment.html?ref=${encodeURIComponent(order.ref)}`;

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
      '━━━━━━━━━━━━━━━━━━━━━━━━',
      `✅ Confirm payment received — tap link below:`,
      confirmPayUrl,
      '',
      '👉 Dashboard: ducor-international-pharmacy.com/dashboard.html',
    ].filter(Boolean).join('\n');

    const result = await sendWhatsApp(API_URL, ID, TOKEN, message);
    return res.status(200).json(result);

  } catch (err) {
    return res.status(200).json({ ok: false, error: err.message });
  }
}
