/**
 * Optional remoting API auth helpers.
 *
 * Default OFF: API_AUTH_ENFORCE is not "1" → requireAuth is a no-op so live
 * checkout / email / SMS / chat keep working until Nadia wires Bearer from
 * clients and Marcus sets GROUP_POST_SECRET / API_AUTH_ENFORCE=1 (+ Firebase SA).
 *
 * Cron secret: GROUP_POST_SECRET + header x-cron-secret (same as api/cron/*).
 * Cron routes that already check the secret should keep checking even when
 * API_AUTH_ENFORCE is off — use assertCronSecret directly there.
 *
 * Firebase (when enforcing Bearer):
 *   FIREBASE_SERVICE_ACCOUNT_JSON — full SA JSON string (project_id used for aud/iss)
 *   FIREBASE_PROJECT_ID — optional override (e.g. ducor-pharmacy)
 *
 * TODO(Nadia/Marcus): swap JWT+certs verify for firebase-admin initialized from
 * FIREBASE_SERVICE_ACCOUNT_JSON when the dependency is available on Vercel.
 */

import { createPublicKey, timingSafeEqual, verify as cryptoVerify } from 'node:crypto';

const ENFORCE = () => process.env.API_AUTH_ENFORCE === '1';

function safeEqualString(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function getHeader(req, name) {
  const headers = req.headers || {};
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === lower) return Array.isArray(v) ? v[0] : v;
  }
  return undefined;
}

function getBearerToken(req) {
  const h = getHeader(req, 'authorization');
  if (typeof h !== 'string') return null;
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m ? m[1].trim() : null;
}

function b64urlJson(segment) {
  const padded = segment + '='.repeat((4 - (segment.length % 4)) % 4);
  const json = Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
  return JSON.parse(json);
}

function projectIdFromEnv() {
  if (process.env.FIREBASE_PROJECT_ID) return process.env.FIREBASE_PROJECT_ID;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const sa = JSON.parse(raw);
    return sa.project_id || null;
  } catch {
    return null;
  }
}

let _certsCache = { at: 0, map: null };

async function getGoogleCerts() {
  const now = Date.now();
  if (_certsCache.map && now - _certsCache.at < 60 * 60 * 1000) return _certsCache.map;
  const r = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );
  if (!r.ok) throw new Error(`cert fetch ${r.status}`);
  const map = await r.json();
  _certsCache = { at: now, map };
  return map;
}

/**
 * Timing-safe check that x-cron-secret (or Bearer token) matches GROUP_POST_SECRET.
 * Does not write a response — callers (cron handlers / requireAuth) decide 401.
 * @returns {boolean}
 */
export function assertCronSecret(req) {
  const expected = process.env.GROUP_POST_SECRET;
  if (!expected) return false;
  const headerSecret = getHeader(req, 'x-cron-secret');
  if (typeof headerSecret === 'string' && safeEqualString(headerSecret, expected)) return true;
  const bearer = getBearerToken(req);
  if (bearer && safeEqualString(bearer, expected)) return true;
  return false;
}

/**
 * Verify Firebase ID token via Google securetoken x509 certs (Node built-ins + fetch).
 * When API_AUTH_ENFORCE is off, returns null (caller should not treat as failure).
 * @returns {Promise<{ uid: string, claims: object } | null>}
 */
export async function verifyFirebaseBearer(req) {
  if (!ENFORCE()) return null;

  const idToken = getBearerToken(req);
  if (!idToken) return null;

  const projectId = projectIdFromEnv();
  if (!projectId) {
    const err = new Error(
      'API_AUTH_ENFORCE=1 but FIREBASE_SERVICE_ACCOUNT_JSON / FIREBASE_PROJECT_ID not configured'
    );
    err.code = 'CONFIG';
    throw err;
  }

  const parts = idToken.split('.');
  if (parts.length !== 3) return null;

  let header;
  let payload;
  try {
    header = b64urlJson(parts[0]);
    payload = b64urlJson(parts[1]);
  } catch {
    return null;
  }

  if (header.alg !== 'RS256' || !header.kid) return null;

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && now >= payload.exp) return null;
  if (payload.iat && payload.iat > now + 60) return null;
  if (payload.aud !== projectId) return null;
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null;
  if (!payload.sub || typeof payload.sub !== 'string') return null;

  const certs = await getGoogleCerts();
  const pem = certs[header.kid];
  if (!pem) return null;

  const data = Buffer.from(`${parts[0]}.${parts[1]}`);
  const sig = Buffer.from(parts[2].replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  const key = createPublicKey(pem);
  const ok = cryptoVerify('RSA-SHA256', data, key, sig);
  if (!ok) return null;

  return { uid: payload.sub, claims: payload };
}

/**
 * Gate for remoting handlers. Returns false after writing 401/403/503 so callers can:
 *   if (!await requireAuth(req, res, { cronOk: true })) return;
 *
 * @param {{ claims?: string[], cronOk?: boolean }} [opts]
 * @returns {Promise<boolean>}
 */
export async function requireAuth(req, res, opts = {}) {
  if (!ENFORCE()) return true;

  const { claims: requiredClaims = [], cronOk = false } = opts;

  if (cronOk && assertCronSecret(req)) return true;

  let verified;
  try {
    verified = await verifyFirebaseBearer(req);
  } catch (err) {
    if (err?.code === 'CONFIG') {
      res.status(503).json({
        ok: false,
        error:
          'API auth enforced but Firebase is not configured (set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID)',
      });
      return false;
    }
    console.error('verifyFirebaseBearer failed:', err?.message || err);
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return false;
  }

  if (!verified) {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return false;
  }

  for (const claim of requiredClaims) {
    if (!verified.claims?.[claim]) {
      res.status(403).json({ ok: false, error: 'Forbidden' });
      return false;
    }
  }

  req.auth = verified;
  return true;
}

export default requireAuth;
