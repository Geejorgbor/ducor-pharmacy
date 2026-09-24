/**
 * Optional API auth gate for remoting handlers (chat / email / SMS / WhatsApp).
 *
 * Default OFF (REQUIRE_API_AUTH !== 'true') so live checkout / email / SMS / chat
 * keep working until Nadia wires Bearer from clients and Marcus sets
 * GROUP_POST_SECRET / REQUIRE_API_AUTH (and Firebase lookup key or SA).
 *
 * Env (when enabled):
 *   REQUIRE_API_AUTH=true
 *   GROUP_POST_SECRET — matches header x-cron-secret (same as api/cron/*)
 *   FIREBASE_WEB_API_KEY — Identity Toolkit token lookup (scaffold)
 * Future Admin verify (not required for this scaffold):
 *   FIREBASE_SERVICE_ACCOUNT_JSON (+ optional FIREBASE_PROJECT_ID=ducor-pharmacy)
 *   or FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY + FIREBASE_PROJECT_ID
 */

import { timingSafeEqual } from 'node:crypto';

function safeEqualString(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function getBearerToken(req) {
  const h = req.headers?.authorization || req.headers?.Authorization || '';
  if (typeof h !== 'string') return null;
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m ? m[1].trim() : null;
}

/**
 * @returns {Promise<{ ok: true, skipped?: boolean, uid?: string } | { ok: false }>}
 * On failure, writes the HTTP response and returns { ok: false }.
 */
export async function requireApiAuth(req, res) {
  if (process.env.REQUIRE_API_AUTH !== 'true') {
    return { ok: true, skipped: true };
  }

  const cronHeader = req.headers?.['x-cron-secret'];
  const groupSecret = process.env.GROUP_POST_SECRET;
  if (groupSecret && typeof cronHeader === 'string' && safeEqualString(cronHeader, groupSecret)) {
    return { ok: true, via: 'cron' };
  }

  const idToken = getBearerToken(req);
  if (!idToken) {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return { ok: false };
  }

  const apiKey = process.env.FIREBASE_WEB_API_KEY;
  if (!apiKey) {
    // Prefer FIREBASE_SERVICE_ACCOUNT_JSON for full Admin verify later;
    // scaffold uses Identity Toolkit accounts:lookup with the web API key.
    res.status(503).json({
      ok: false,
      error:
        'API auth enabled but FIREBASE_WEB_API_KEY is not configured (or wire Admin SDK via FIREBASE_SERVICE_ACCOUNT_JSON)',
    });
    return { ok: false };
  }

  try {
    const r = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    const data = await r.json();
    const user = data?.users?.[0];
    if (!r.ok || !user?.localId) {
      res.status(401).json({ ok: false, error: 'Unauthorized' });
      return { ok: false };
    }
    return { ok: true, uid: user.localId };
  } catch (err) {
    console.error('requireApiAuth lookup failed:', err?.message || err);
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return { ok: false };
  }
}

export default requireApiAuth;
