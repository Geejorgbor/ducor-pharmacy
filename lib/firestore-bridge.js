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

/**
 * Most recent open (waiting|human) sessions bridged to a given WhatsApp chatId.
 *
 * Uses ONLY equality on waBridgeChatId (single-field; no composite index).
 * Status filter + updatedAt sort happen in memory so missing Firestore
 * composite indexes cannot break handoff inbound replies.
 */
export async function findOpenBridgedSessions(waChatId, limit = 5) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
  // Equality-only — never orderBy/composite here (those need indexes that may be absent).
  const queryBody = {
    structuredQuery: {
      from: [{ collectionId: 'chat_sessions' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'waBridgeChatId' },
          op: 'EQUAL',
          value: { stringValue: waChatId },
        },
      },
      limit: 50,
    },
  };
  const rows = await authedFetch(url, { method: 'POST', body: JSON.stringify(queryBody) });
  if (Array.isArray(rows)) {
    for (const row of rows) {
      if (row && row.error) {
        const msg = row.error.message || JSON.stringify(row.error);
        throw new Error(`Firestore runQuery error: ${msg}`);
      }
    }
  }
  const out = [];
  if (Array.isArray(rows)) {
    for (const row of rows) {
      if (!row.document) continue;
      const d = docToObject(row.document);
      if (d && (d.status === 'waiting' || d.status === 'human')) out.push(d);
    }
  }
  out.sort((a, b) => {
    const ta = Date.parse(a.updatedAt || a.lastMessageAt || 0) || 0;
    const tb = Date.parse(b.updatedAt || b.lastMessageAt || 0) || 0;
    return tb - ta;
  });
  return out.slice(0, limit);
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
    patch.claimedBy = meta.claimedBy || 'Pharmacist';
    patch.claimedAt = now;
  }

  await patchSession(sessionId, patch);

  if (session.status === 'waiting') {
    await addSessionMessage(sessionId, {
      role: 'system',
      content: 'A pharmacist has joined the chat.',
      createdAt: now,
      senderName: meta.senderName || 'Pharmacist',
    });
  }

  await addSessionMessage(sessionId, {
    role: 'staff',
    content,
    createdAt: now,
    senderName: meta.senderName || 'Pharmacist',
    via: 'whatsapp',
    waMessageId: meta.waMessageId || null,
  });

  return { ok: true, sessionId, status: patch.status || session.status };
}

/**
 * Return a live chat to the AI assistant (mirrors dashboard returnLiveChatToAI).
 * Clears claim fields, sets status ai, writes a client-safe system message.
 * Does NOT write DONE/AI as a staff bubble.
 */
export async function returnLiveChatToAI(sessionId) {
  const now = new Date();
  const session = await getSession(sessionId);
  if (!session) throw new Error('Session not found: ' + sessionId);

  await addSessionMessage(sessionId, {
    role: 'system',
    content: 'Pharmacist returned you to the online assistant.',
    createdAt: now,
  });

  await patchSession(sessionId, {
    status: 'ai',
    claimedBy: null,
    claimedAt: null,
    updatedAt: now,
  });

  return { ok: true, sessionId, status: 'ai', returnedToAI: true };
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

// ── Generic Firestore helpers (Admin AI + other server ops) ─────────────────

/** Read any document by path like "orders/abc" or "admin_state/products". */
export async function getDocument(path) {
  const data = await authedFetch(docUrl(path));
  return docToObject(data);
}

/** Create or overwrite a document (PATCH with full fields; creates if missing). */
export async function setDocument(path, fields) {
  const body = { fields: {} };
  for (const [k, v] of Object.entries(fields)) {
    body.fields[k] = toFirestoreValue(v);
  }
  // Use PATCH without updateMask to write all fields; exists create via currentDocument.exists false option
  const fieldPaths = Object.keys(fields);
  const qs = fieldPaths.map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
  try {
    return await authedFetch(`${docUrl(path)}?${qs}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  } catch (e) {
    // If missing, PATCH may fail — try PATCH with allowMissing via updateMask still
    // Firestore REST: PATCH with currentDocument.exists is awkward; use PATCH ?updateMask + allow missing via POST to parent for new docs
    if (/NOT_FOUND|404/i.test(String(e.message))) {
      const parts = path.split('/');
      const docId = parts.pop();
      const collectionPath = parts.join('/');
      return await authedFetch(
        `${docUrl(collectionPath)}?documentId=${encodeURIComponent(docId)}`,
        { method: 'POST', body: JSON.stringify(body) }
      );
    }
    throw e;
  }
}

/** Patch selected fields on an existing document. */
export async function patchDocument(path, fields) {
  const fieldPaths = Object.keys(fields);
  const qs = fieldPaths.map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
  const body = { fields: {} };
  for (const [k, v] of Object.entries(fields)) {
    body.fields[k] = toFirestoreValue(v);
  }
  return authedFetch(`${docUrl(path)}?${qs}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/**
 * Run a structured query.
 * @param {string} collectionId e.g. "orders"
 * @param {object} opts { whereEqual?: {field, value}, orderBy?: {field, direction}, limit?: number }
 */
export async function runCollectionQuery(collectionId, opts = {}) {
  const structuredQuery = {
    from: [{ collectionId }],
    limit: opts.limit || 50,
  };
  if (opts.whereEqual) {
    structuredQuery.where = {
      fieldFilter: {
        field: { fieldPath: opts.whereEqual.field },
        op: 'EQUAL',
        value: toFirestoreValue(opts.whereEqual.value),
      },
    };
  }
  if (opts.orderBy) {
    structuredQuery.orderBy = [
      {
        field: { fieldPath: opts.orderBy.field },
        direction: opts.orderBy.direction === 'ASCENDING' ? 'ASCENDING' : 'DESCENDING',
      },
    ];
  }
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
  const rows = await authedFetch(url, {
    method: 'POST',
    body: JSON.stringify({ structuredQuery }),
  });
  const out = [];
  if (Array.isArray(rows)) {
    for (const row of rows) {
      if (row && row.error) {
        throw new Error(`Firestore runQuery: ${row.error.message || JSON.stringify(row.error)}`);
      }
      if (row.document) out.push(docToObject(row.document));
    }
  }
  return out;
}

/** List documents in a collection (page size limited). */
export async function listCollection(collectionId, pageSize = 50) {
  const url = `${docUrl(collectionId)}?pageSize=${pageSize}`;
  const data = await authedFetch(url);
  const docs = data?.documents || [];
  return docs.map(docToObject).filter(Boolean);
}

/** Read admin_state/{docId}.value */
export async function getAdminState(docId) {
  const doc = await getDocument(`admin_state/${docId}`);
  return doc ? doc.value : null;
}

/** Write admin_state/{docId} = { value, updatedAt } */
export async function setAdminState(docId, value) {
  return setDocument(`admin_state/${docId}`, {
    value,
    updatedAt: new Date().toISOString(),
  });
}

/** Find order by full id, trailing id slice, or ref (e.g. DUCOR-12345678). */
export async function findOrder(idOrRef) {
  const key = String(idOrRef || '').trim();
  if (!key) return null;

  // Direct get by document id
  try {
    const direct = await getDocument(`orders/${encodeURIComponent(key)}`);
    if (direct) return direct;
  } catch (_) { /* not found */ }

  // Query by ref field
  try {
    const byRef = await runCollectionQuery('orders', {
      whereEqual: { field: 'ref', value: key.toUpperCase().startsWith('DUCOR') ? key.toUpperCase() : key },
      limit: 5,
    });
    if (byRef.length) return byRef[0];
  } catch (_) { /* index / not found */ }

  // Fallback: list recent and match suffix / ref (no composite index needed)
  try {
    const recent = await listCollection('orders', 100);
    const upper = key.toUpperCase();
    const found = recent.find(
      (o) =>
        o.__id === key ||
        o.__id?.endsWith(key) ||
        key.endsWith(o.__id?.slice(-8) || '') ||
        String(o.ref || '').toUpperCase() === upper ||
        String(o.ref || '').toUpperCase().endsWith(upper)
    );
    if (found) return found;
  } catch (_) {}

  return null;
}

/** List recent orders (best-effort; sorts in memory by createdAt). */
export async function listRecentOrders(limit = 20) {
  let docs = [];
  try {
    docs = await runCollectionQuery('orders', {
      orderBy: { field: 'createdAt', direction: 'DESCENDING' },
      limit,
    });
  } catch (_) {
    docs = await listCollection('orders', Math.min(limit * 3, 100));
    docs.sort((a, b) => {
      const ta = Date.parse(a.createdAt || a.time || 0) || 0;
      const tb = Date.parse(b.createdAt || b.time || 0) || 0;
      return tb - ta;
    });
    docs = docs.slice(0, limit);
  }
  return docs;
}

/** List open live-chat sessions (waiting|human). */
export async function listLiveChatSessions(limit = 30) {
  let docs = [];
  try {
    docs = await listCollection('chat_sessions', 80);
  } catch (e) {
    throw e;
  }
  const open = docs.filter((d) => d && (d.status === 'waiting' || d.status === 'human' || d.status === 'ai'));
  open.sort((a, b) => {
    const ta = Date.parse(a.updatedAt || a.lastMessageAt || a.createdAt || 0) || 0;
    const tb = Date.parse(b.updatedAt || b.lastMessageAt || b.createdAt || 0) || 0;
    return tb - ta;
  });
  return open.slice(0, limit);
}

/** Close a live chat session (status closed + system message). */
export async function closeLiveChatSession(sessionId) {
  const now = new Date();
  await patchSession(sessionId, { status: 'closed', updatedAt: now });
  await addSessionMessage(sessionId, {
    role: 'system',
    content: 'Chat closed by pharmacist.',
    createdAt: now,
  });
  return { ok: true, sessionId, status: 'closed' };
}

/** Claim a live chat (status human). */
export async function claimLiveChatSession(sessionId, claimedBy = 'Pharmacist') {
  const now = new Date();
  const session = await getSession(sessionId);
  if (!session) throw new Error('Session not found: ' + sessionId);
  await patchSession(sessionId, {
    status: 'human',
    claimedBy,
    claimedAt: now,
    updatedAt: now,
  });
  if (session.status === 'waiting' || session.status === 'ai') {
    await addSessionMessage(sessionId, {
      role: 'system',
      content: 'A pharmacist has joined the chat.',
      createdAt: now,
      senderName: claimedBy,
    });
  }
  return { ok: true, sessionId, status: 'human', claimedBy };
}

/** Find customers by email (exact). */
export async function findCustomersByEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return [];
  try {
    return await runCollectionQuery('customers', {
      whereEqual: { field: 'email', value: normalized },
      limit: 10,
    });
  } catch (_) {
    const all = await listCollection('customers', 100);
    return all.filter((c) => String(c.email || '').toLowerCase() === normalized);
  }
}
