/**
 * WhatsApp ↔ Live Chat handoff helpers.
 *
 * OUTBOUND alerts and INBOUND reply bridging go to Lucas Lonestar ONLY:
 *   +231 778 174 157  →  chatId 231778174157@c.us
 * Never BOSS_CHAT_ID (231887221275) or DEV_CHAT_ID for this handoff path.
 *
 * Try-now / after-hours: the website still creates a handoff + notifies Lonestar
 * outside Mon–Sat 9AM–5PM so replies can be tested anytime; clients only see
 * pharmacist/assistant copy (see assets/ducor-widgets.js).
 */

import {
  bridgeConfigured,
  findOpenBridgedSessions,
  findSessionByCode,
  parseSessionCode,
  returnLiveChatToAI,
  sessionCodeFromId,
  stripCodeFromReply,
  writeWhatsAppStaffReply,
} from './firestore-bridge.js';

/** Lucas Lonestar — ONLY destination for live-chat handoff WhatsApp alerts. */
export const LONESTAR_CHAT_ID = '231778174157@c.us';
export const LONESTAR_PHONE_DISPLAY = '+231 778 174 157';

export const DASHBOARD_LIVE_CHAT_URL =
  'https://ducor-international-pharmacy.com/dashboard.html?section=live-chat';

export function buildHandoffAlert({
  sessionId,
  sessionCode,
  lastMessage,
  pageUrl,
  reason,
  clientName,
  clientPhone,
  clientEmail,
  askingAbout,
}) {
  const code = sessionCode || sessionCodeFromId(sessionId);
  const last = String(lastMessage || '(no message yet)').slice(0, 500);
  const why = String(reason || '').trim().slice(0, 200);
  const name = String(clientName || '').trim().slice(0, 80);
  const phone = String(clientPhone || '').trim().slice(0, 40);
  const email = String(clientEmail || '').trim().slice(0, 120);
  const ask = String(askingAbout || '').trim().slice(0, 280);
  const when = new Date().toLocaleString('en-US', { timeZone: 'Africa/Monrovia' });
  return [
    '🌐 WEBSITE-CHAT — Ducor Pharmacy',
    '━━━━━━━━━━━━━━━━━━━━━━━━',
    'This is a website-chat alert, not a normal WhatsApp text.',
    `🔖 Code: ${code}`,
    name ? `👤 Name: ${name}` : '👤 Name: (not provided)',
    phone ? `📞 Phone: ${phone}` : null,
    email ? `✉️ Email: ${email}` : null,
    why ? `📌 Reason: ${why}` : null,
    ask ? `💬 Asking about: ${ask}` : null,
    'Reply here to send your message to the website client.',
    'Reply DONE or AI to return this chat to the assistant.',
    '━━━━━━━━━━━━━━━━━━━━━━━━',
    '💬 Last client message:',
    `"${last}"`,
    '━━━━━━━━━━━━━━━━━━━━━━━━',
    pageUrl ? `🌐 Page: ${String(pageUrl).slice(0, 200)}` : null,
    `📋 Session: ${sessionId}`,
    '',
    '🔗 Dashboard → Live Chat:',
    DASHBOARD_LIVE_CHAT_URL,
    '',
    `⏰ ${when} (Monrovia)`,
  ]
    .filter((line) => line !== null && line !== undefined)
    .join('\n');
}

export function buildFollowUpAlert({ sessionId, sessionCode, lastMessage, pageUrl }) {
  const code = sessionCode || '????????';
  const last = String(lastMessage || '').slice(0, 500);
  const when = new Date().toLocaleString('en-US', { timeZone: 'Africa/Monrovia' });
  return [
    '🌐 WEBSITE-CHAT — Ducor Pharmacy',
    '━━━━━━━━━━━━━━━━━━━━━━━━',
    `🔖 Code: ${code}`,
    'New client message in the website chat.',
    `💬 Last client message:`,
    `"${last}"`,
    '━━━━━━━━━━━━━━━━━━━━━━━━',
    'Reply here to send your message to the website client.',
    'Reply DONE or AI to return this chat to the assistant.',
    pageUrl ? `🌐 Page: ${String(pageUrl).slice(0, 200)}` : null,
    sessionId ? `📋 Session: ${sessionId}` : null,
    '',
    '🔗 Dashboard → Live Chat:',
    DASHBOARD_LIVE_CHAT_URL,
    '',
    `⏰ ${when} (Monrovia)`,
  ]
    .filter((line) => line !== null && line !== undefined)
    .join('\n');
}

/**
 * Extract plain text from a Green API incomingMessageReceived body
 * (webhook or receiveNotification.body).
 */
export function extractInboundText(body) {
  if (!body || typeof body !== 'object') return '';
  const md = body.messageData || {};
  const type = md.typeMessage || '';
  if (type === 'textMessage' && md.textMessageData) {
    return md.textMessageData.textMessage || '';
  }
  if (type === 'extendedTextMessage' && md.extendedTextMessageData) {
    return md.extendedTextMessageData.text || '';
  }
  if (type === 'quotedMessage' && md.extendedTextMessageData) {
    return md.extendedTextMessageData.text || '';
  }
  // Some payloads nest under messageData.quotedMessage / textMessageData
  if (md.textMessageData?.textMessage) return md.textMessageData.textMessage;
  if (md.extendedTextMessageData?.text) return md.extendedTextMessageData.text;
  return '';
}

export function inboundSenderChatId(body) {
  const sd = body?.senderData || {};
  return sd.sender || sd.chatId || '';
}

/**
 * True when Lonestar's cleaned reply is essentially DONE or AI
 * (case-insensitive). Allows `Code: XXX DONE` after stripCodeFromReply.
 */
export function isReturnToAICommand(text) {
  const t = String(text || '').trim();
  return /^(DONE|AI)$/i.test(t);
}

/**
 * Process one Green API incoming message notification.
 * Only Lonestar's chat is accepted for handoff bridging.
 */
export async function processInboundHandoffMessage(body) {
  if (!body || body.typeWebhook !== 'incomingMessageReceived') {
    return { ok: true, skipped: true, reason: 'not_incoming_message' };
  }

  const chatId = inboundSenderChatId(body);
  if (chatId !== LONESTAR_CHAT_ID) {
    return { ok: true, skipped: true, reason: 'not_lonestar', chatId };
  }

  const rawText = extractInboundText(body).trim();
  if (!rawText) {
    return { ok: true, skipped: true, reason: 'no_text' };
  }

  if (!bridgeConfigured()) {
    return {
      ok: false,
      error:
        'Firestore bridge not configured (FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_BRIDGE_PASSWORD)',
    };
  }

  const code = parseSessionCode(rawText);
  let session = null;
  let resolveNote = null;

  if (code) {
    session = await findSessionByCode(code);
    if (!session) resolveNote = 'code_not_found';
  }

  if (!session) {
    const open = await findOpenBridgedSessions(LONESTAR_CHAT_ID, 5);
    if (open.length === 1) {
      session = open[0];
      resolveNote = code ? 'code_miss_fallback_single' : 'single_open_session';
    } else if (open.length > 1 && !code) {
      return {
        ok: false,
        needCode: true,
        codes: open.map((s) => s.sessionCode || sessionCodeFromId(s.__id)),
        reason: 'multiple_open_sessions',
      };
    } else if (!session) {
      return { ok: false, error: 'No matching live chat session', code, resolveNote };
    }
  }

  const sessionId = session.__id;
  const cleaned = stripCodeFromReply(rawText) || rawText;
  const sessionCode = session.sessionCode || sessionCodeFromId(sessionId);

  // Lonestar: DONE / AI returns the customer to the online assistant
  // (mirrors dashboard returnLiveChatToAI). Do not write DONE/AI as staff text.
  if (isReturnToAICommand(cleaned)) {
    const result = await returnLiveChatToAI(sessionId);
    return {
      ok: true,
      sessionId,
      sessionCode,
      resolveNote,
      returnedToAI: true,
      ...result,
    };
  }

  const result = await writeWhatsAppStaffReply(sessionId, cleaned, {
    senderName: 'Pharmacist',
    claimedBy: 'Pharmacist',
    waMessageId: body.idMessage || null,
  });

  return {
    ok: true,
    sessionId,
    sessionCode,
    resolveNote,
    ...result,
  };
}
