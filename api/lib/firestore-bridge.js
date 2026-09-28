/**
 * Server-side Firestore writes for the WhatsApp ↔ Live Chat bridge.
 * Bypasses / satisfies admin rules without shipping firebase-admin (no package.json).
 *
 * Auth (first match wins):
 *   1. FIREBASE_SERVICE_ACCOUNT_JSON — full service-account JSON (preferred; bypasses rules)
 *   2. FIREBASE_BRIDGE_EMAIL + FIREBASE_BRIDGE_PASSWORD — sign in as operator (rules apply;
 *      email must be in firestore.rules isAdmin() allowlist, currently lucaspaye02@gmail.com)
 *
 * Optional: FIREBASE_WEB_API_KEY (defaults to the public web key already used by the site).
 * Optional: FIREBASE_PROJECT_ID (defaults to ducor-pharmacy).
 */

import crypto from 'crypto';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'ducor-pharmacy';
const WEB_API_KEY =
  process.env.FIREBASE_WEB_API_KEY ||
  'AIzaSyB2N6CcL0cGxBLfSdPANHJjjKuP5Rp0EIE';

let cachedToken = null; // { accessToken, expiresAt, mode: 'sa'|'user' }

function b64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function parseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function tokenFromServiceAccount(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(
    JSON.stringify({
      iss: sa.client_email,
      sub: sa.client_email,
      scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })
  );
  const unsigned = `${header}.${claim}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const sig = signer
    .sign(sa.private_key)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  const jwt = `${unsigned}.${sig}`;
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const data = await resp.json();
  if (!data.access_token) {
    throw new Error('Service account token failed: ' + (data.error_description || data.error || resp.status));
  }
  return {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000 - 60_000,
    mode: 'sa',
  };
}

async function tokenFromPassword() {
  const email = process.env.FIREBASE_BRIDGE_EMAIL || 'lucaspaye02@gmail.com';
  const password = process.env.FIREBASE_BRIDGE_PASSWORD;
  if (!password) return null;
  const resp = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${WEB_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const data = await resp.json();
  if (!data.idToken) {
    throw new Error('Bridge sign-in failed: ' + (data.error?.message || resp.status));
  }
  return {
    accessToken: data.idToken,
    expiresAt: Date.now() + (Number(data.expiresIn) || 3600) * 1000 - 60_000,
    mode: 'user',
  };
}

export async function getBridgeToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken;
  const sa = parseServiceAccount();
  if (sa) {
    cachedToken = await tokenFromServiceAccount(sa);
    return cachedToken;
  }
  const userTok = await tokenFromPassword();
  if (userTok) {
    cachedToken = userTok;
    return cachedToken;
  }
  throw new Error(
    'Firestore bridge not configured — set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_BRIDGE_PASSWORD'
  );
}

export function bridgeConfigured() {
  return !!(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_BRIDGE_PASSWORD);
}

function docUrl(path) {
  // path like chat_sessions/abc or chat_sessions/abc/messages
  return `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${path}`;
}

function toFirestoreValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') {
    if (Number.isInteger(v)) return { integerValue: String(v) };
    return { doubleValue: v };
  }
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) {
    return { arrayValue: { values: v.map(toFirestoreValue) } };
  }
  if (typeof v === 'object') {
    const fields = {};
    for (const [k, val] of Object.entries(v)) fields[k] = toFirestoreValue(val);
    return { mapValue: { fields } };
  }
  return { stringValue: String(v) };
}

function fromFirestoreValue(fv) {
  if (!fv || typeof fv !== 'object') return null;
  if ('stringValue' in fv) return fv.stringValue;
  if ('integerValue' in fv) return Number(fv.integerValue);
  if ('doubleValue' in fv) return fv.doubleValue;
  if ('booleanValue' in fv) return fv.booleanValue;
  if ('timestampValue' in fv) return fv.timestampValue;
  if ('nullValue' in fv) return null;
  if ('mapValue' in fv) {
    const out = {};
    const fields = fv.mapValue.fields || {};
    for (const [k, val] of Object.entries(fields)) out[k] = fromFirestoreValue(val);
    return out;
  }
  if ('arrayValue' in fv) {
    return (fv.arrayValue.values || []).map(fromFirestoreValue);
  }
  return null;
}

function docToObject(doc) {
  if (!doc || !doc.fields) return null;
  const out = {};
  for (const [k, v] of Object.entries(doc.fields)) out[k] = fromFirestoreValue(v);
  const name = doc.name || '';
  const id = name.split('/').pop();
  out.__id = id;
  out.__name = name;
  return out;
}

async function authedFetch(url, opts = {}) {
  const tok = await getBridgeToken();
  const headers = Object.assign(
    { Authorization: `Bearer ${tok.accessToken}`, 'Content-Type': 'application/json' },
    opts.headers || {}
  );
  const resp = await fetch(url, { ...opts, headers });
  const text = await resp.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!resp.ok) {
    const msg = data?.error?.message || data?.error || text || resp.status;
    throw new Error(`Firestore ${resp.status}: ${msg}`);
  }
  return data;
}

/** Read a chat_sessions doc by full UUID id. */
export async function getSession(sessionId) {
  const data = await authedFetch(docUrl(`chat_sessions/${encodeURIComponent(sessionId)}`));
  return docToObject(data);
}

/**
 * Find session by short code (8 hex chars). Uses a runQuery against sessionCode field.
 * Falls back to prefix match on document id if needed.
 */
export async function findSessionByCode(code) {
  const normalized = String(code || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (normalized.length < 6) return null;

  const queryBody = {
    structuredQuery: {
      from: [{ collectionId: 'chat_sessions' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'sessionCode' },
          op: 'EQUAL',
          value: { stringValue: normalized },
        },
      },
      limit: 1,
    },
  };
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
  const rows = await authedFetch(url, { method: 'POST', body: JSON.stringify(queryBody) });
  if (Array.isArray(rows)) {
    for (const row of rows) {
      if (row.document) return docToObject(row.document);
    }
  }

  // Fallback: UUID without dashes starting with code (session ids are UUIDs)
  // List is not ideal; try direct get if code looks like start of a known id pattern.
  return null;
}

/** Most recent open (waiting|human) sessions bridged to a given WhatsApp chatId. */
export async function findOpenBridgedSessions(waChatId, limit = 5) {
  const queryBody = {
    structuredQuery: {
      from: [{ collectionId: 'chat_sessions' }],
      where: {
        compositeFilter: {
          op: 'AND',
          filters: [
            {
              fieldFilter: {
                field: { fieldPath: 'waBridgeChatId' },
                op: 'EQUAL',
                value: { stringValue: waChatId },
              },
            },
            {
              fieldFilter: {
                field: { fieldPath: 'status' },
                op: 'IN',
                value: {
                  arrayValue: {
                    values: [{ stringValue: 'waiting' }, { stringValue: 'human' }],
                  },
                },
              },
            },
          ],
        },
      },
      orderBy: [{ field: { fieldPath: 'updatedAt' }, direction: 'DESCENDING' }],
      limit,
    },
  };
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
  try {
    const rows = await authedFetch(url, { method: 'POST', body: JSON.stringify(queryBody) });
    const out = [];
    if (Array.isArray(rows)) {
      for (const row of rows) {
        if (row.document) out.push(docToObject(row.document));
      }
    }
    return out;
  } catch (e) {
    // Composite index may be missing — fall back to simpler query on waBridgeChatId only
    const simple = {
      structuredQuery: {
        from: [{ collectionId: 'chat_sessions' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'waBridgeChatId' },
            op: 'EQUAL',
            value: { stringValue: waChatId },
          },
        },
        orderBy: [{ field: { fieldPath: 'updatedAt' }, direction: 'DESCENDING' }],
        limit: 20,
      },
    };
    const rows = await authedFetch(url, { method: 'POST', body: JSON.stringify(simple) });
    const out = [];
    if (Array.isArray(rows)) {
      for (const row of rows) {
        if (!row.document) continue;
        const d = docToObject(row.document);
        if (d && (d.status === 'waiting' || d.status === 'human')) out.push(d);
      }
    }
    return out.slice(0, limit);
  }
}

/** Patch session fields (admin / service account). */
export async function patchSession(sessionId, fields) {
  const fieldPaths = Object.keys(fields);
  const qs = fieldPaths.map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
  const body = { fields: {} };
  for (const [k, v] of Object.entries(fields)) {
    body.fields[k] = toFirestoreValue(v);
  }
  return authedFetch(`${docUrl(`chat_sessions/${encodeURIComponent(sessionId)}`)}?${qs}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/** Add a message under chat_sessions/{id}/messages. */
export async function addSessionMessage(sessionId, message) {
  const body = { fields: {} };
  for (const [k, v] of Object.entries(message)) {
    body.fields[k] = toFirestoreValue(v);
  }
  return authedFetch(docUrl(`chat_sessions/${encodeURIComponent(sessionId)}/messages`), {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Write a Lonestar WhatsApp reply into the website live chat as staff,
 * claim the session if still waiting, and bump unreadClient.
 */
export async function writeWhatsAppStaffReply(sessionId, text, meta = {}) {
  const now = new Date();
  const content = String(text || '').trim().slice(0, 4000);
  if (!content) throw new Error('Empty reply');

  const session = await getSession(sessionId);
  if (!session) throw new Error('Session not found: ' + sessionId);

  const patch = {
    updatedAt: now,
    lastMessage: content.slice(0, 200),
    lastMessageAt: now,
    lastMessageRole: 'staff',
    unreadClient: Number(session.unreadClient || 0) + 1,
  };
  if (session.status === 'waiting' || session.status === 'ai') {
    patch.status = 'human';
    patch.claimedBy = meta.claimedBy || 'Lucas Lonestar (WhatsApp)';
    patch.claimedAt = now;
  }

  await patchSession(sessionId, patch);

  if (session.status === 'waiting') {
    await addSessionMessage(sessionId, {
      role: 'system',
      content: 'Pharmacist joined via WhatsApp.',
      createdAt: now,
      senderName: meta.senderName || 'Lucas Lonestar',
    });
  }

  await addSessionMessage(sessionId, {
    role: 'staff',
    content,
    createdAt: now,
    senderName: meta.senderName || 'Lucas Lonestar',
    via: 'whatsapp',
    waMessageId: meta.waMessageId || null,
  });

  return { ok: true, sessionId, status: patch.status || session.status };
}

/** Short code used in WhatsApp alerts (8 chars from UUID). */
export function sessionCodeFromId(sessionId) {
  return String(sessionId || '')
    .replace(/-/g, '')
    .slice(0, 8)
    .toUpperCase();
}

/** Parse a short session code out of an inbound WhatsApp text. */
export function parseSessionCode(text) {
  const t = String(text || '');
  const patterns = [
    /\bCode:\s*([A-Fa-f0-9]{8})\b/i,
    /\[(?:DUCOR[-_])?([A-Fa-f0-9]{8})\]/i,
    /\bDUCOR[-_]?([A-Fa-f0-9]{8})\b/i,
    /\bREF:\s*([A-Fa-f0-9]{8})\b/i,
    /^\s*([A-Fa-f0-9]{8})\s*[:\-–]/m,
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (m) return m[1].toUpperCase();
  }
  return null;
}

/** Strip leading code markers so the customer sees a clean reply. */
export function stripCodeFromReply(text) {
  return String(text || '')
    .replace(/^\s*(?:Code|REF):\s*[A-Fa-f0-9]{8}\s*[:\-–]?\s*/i, '')
    .replace(/^\s*\[(?:DUCOR[-_])?[A-Fa-f0-9]{8}\]\s*/i, '')
    .replace(/^\s*DUCOR[-_]?[A-Fa-f0-9]{8}\s*[:\-–]?\s*/i, '')
    .replace(/^\s*[A-Fa-f0-9]{8}\s*[:\-–]\s*/i, '')
    .trim();
}
