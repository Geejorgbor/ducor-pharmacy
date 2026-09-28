/**
 * Poll Green API receiveNotification → bridge handoff replies into Live Chat.
 *
 * Use when webhook is not configured yet, or as a backup.
 * Call with a shared secret:
 *   GET/POST /api/whatsapp-poll?secret=GROUP_POST_SECRET
 *   (reuses GROUP_POST_SECRET, or set WHATSAPP_POLL_SECRET)
 *
 * Processes up to `limit` notifications (default 10), deletes each after handling.
 * Accepts Lonestar OR Boss (275). Green API credentials stay server-side.
 */

import {
  processInboundHandoffMessage,
} from './lib/whatsapp-handoff.js';
import { sendWhatsApp } from './lib/green-send.js';

function authorized(req) {
  const expected =
    process.env.WHATSAPP_POLL_SECRET || process.env.GROUP_POST_SECRET || '';
  if (!expected) return false;
  const q = req.query?.secret || '';
  const h = req.headers['x-poll-secret'] || '';
  const bodySecret = req.body?.secret || '';
  return q === expected || h === expected || bodySecret === expected;
}

async function receiveOne(apiUrl, id, token, timeoutSec = 5) {
  const url = `${apiUrl}/waInstance${id}/receiveNotification/${token}?receiveTimeout=${timeoutSec}`;
  const resp = await fetch(url, { method: 'GET' });
  if (resp.status === 200) {
    const text = await resp.text();
    if (!text || text === 'null') return null;
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }
  return null;
}

async function deleteOne(apiUrl, id, token, receiptId) {
  const url = `${apiUrl}/waInstance${id}/deleteNotification/${token}/${receiptId}`;
  await fetch(url, { method: 'DELETE' });
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  if (!authorized(req)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  const API_URL = process.env.GREEN_API_URL;
  const ID = process.env.GREEN_API_ID;
  const TOKEN = process.env.GREEN_API_TOKEN;
  if (!API_URL || !ID || !TOKEN) {
    return res.status(200).json({ ok: false, error: 'WhatsApp not configured' });
  }

  const limit = Math.min(Number(req.query?.limit || req.body?.limit || 10), 30);
  const results = [];

  for (let i = 0; i < limit; i++) {
    const note = await receiveOne(API_URL, ID, TOKEN, i === 0 ? 5 : 1);
    if (!note || !note.receiptId) break;

    const body = note.body || {};
    let handled = { ok: true, skipped: true, reason: 'unhandled_type' };
    try {
      handled = await processInboundHandoffMessage(body);
      const replyTo = handled.replyToChatId || null;

      if (handled.needCode && Array.isArray(handled.codes) && replyTo) {
        const msg = [
          'Several live chats are open. Reply like:',
          `Code: ${handled.codes[0]} Your message here`,
          '',
          'Open codes: ' + handled.codes.join(', '),
        ].join('\n');
        try {
          await sendWhatsApp(API_URL, ID, TOKEN, msg, replyTo);
        } catch (_) {}
      } else if (handled.ok && handled.sessionId && !handled.skipped && replyTo) {
        const confirm = handled.returnedToAI
          ? `✓ Returned to assistant (Code: ${handled.sessionCode})`
          : `✓ Sent to website chat (Code: ${handled.sessionCode})`;
        try {
          await sendWhatsApp(API_URL, ID, TOKEN, confirm, replyTo);
        } catch (_) {}
      }
    } catch (err) {
      handled = { ok: false, error: err.message || String(err) };
    }

    try {
      await deleteOne(API_URL, ID, TOKEN, note.receiptId);
    } catch (_) {}

    results.push({ receiptId: note.receiptId, typeWebhook: body.typeWebhook, handled });
  }

  return res.status(200).json({ ok: true, processed: results.length, results });
}
