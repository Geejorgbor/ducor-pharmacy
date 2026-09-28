/**
 * Green API webhook receiver — inbound WhatsApp → Live Chat staff messages.
 *
 * Configure in Green API console (or SetSettings):
 *   webhookUrl      = https://ducor-international-pharmacy.com/api/whatsapp-incoming
 *   webhookUrlToken = <same value as GREEN_API_WEBHOOK_TOKEN in Vercel>  (optional but recommended)
 *   incomingWebhook = yes
 *
 * Only Lucas Lonestar (+231778174157 / 231778174157@c.us) replies are bridged.
 * Green API token is never exposed client-side.
 */

import {
  LONESTAR_CHAT_ID,
  processInboundHandoffMessage,
} from './lib/whatsapp-handoff.js';
import { sendWhatsApp } from './lib/green-send.js';

function checkWebhookAuth(req) {
  const expected = process.env.GREEN_API_WEBHOOK_TOKEN;
  if (!expected) return true; // optional
  const auth = req.headers.authorization || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const headerTok = req.headers['x-green-api-token'] || req.headers['x-webhook-token'] || '';
  const q = req.query?.token || '';
  const got = bearer || headerTok || q;
  return got && got === expected;
}

export default async function handler(req, res) {
  // Green API may probe with GET
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, service: 'ducor-whatsapp-incoming' });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  if (!checkWebhookAuth(req)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  const body = req.body || {};

  try {
    const result = await processInboundHandoffMessage(body);

    // If Lonestar must pick a session code, nudge them on WhatsApp
    if (result.needCode && Array.isArray(result.codes)) {
      const API_URL = process.env.GREEN_API_URL;
      const ID = process.env.GREEN_API_ID;
      const TOKEN = process.env.GREEN_API_TOKEN;
      if (API_URL && ID && TOKEN) {
        const msg = [
          'Several live chats are open. Reply like:',
          `Code: ${result.codes[0]} Your message here`,
          '',
          'Open codes: ' + result.codes.join(', '),
        ].join('\n');
        try {
          await sendWhatsApp(API_URL, ID, TOKEN, msg, LONESTAR_CHAT_ID);
        } catch (_) {}
      }
    }

    // Ack delivered (optional short confirm)
    if (result.ok && result.sessionId && !result.skipped) {
      const API_URL = process.env.GREEN_API_URL;
      const ID = process.env.GREEN_API_ID;
      const TOKEN = process.env.GREEN_API_TOKEN;
      if (API_URL && ID && TOKEN) {
        const confirm = result.returnedToAI
          ? `✓ Returned to assistant (Code: ${result.sessionCode})`
          : `✓ Sent to website chat (Code: ${result.sessionCode})`;
        try {
          await sendWhatsApp(API_URL, ID, TOKEN, confirm, LONESTAR_CHAT_ID);
        } catch (_) {}
      }
    }

    return res.status(200).json(result);
  } catch (err) {
    return res.status(200).json({ ok: false, error: err.message || String(err) });
  }
}
