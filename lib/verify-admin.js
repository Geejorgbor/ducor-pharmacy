/**
 * Verify Firebase ID token + enforce isAdmin allowlist.
 * Uses Identity Toolkit accounts:lookup (no firebase-admin package needed).
 */
import { isAdminEmail } from './admin-emails.js';

const WEB_API_KEY =
  process.env.FIREBASE_WEB_API_KEY ||
  'AIzaSyB2N6CcL0cGxBLfSdPANHJjjKuP5Rp0EIE';

/**
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<{ok:true,email:string,uid:string}|{ok:false,status:number,error:string}>}
 */
export async function verifyAdminBearer(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || '';
  const token = typeof header === 'string' && header.startsWith('Bearer ')
    ? header.slice(7).trim()
    : '';
  if (!token) {
    return { ok: false, status: 401, error: 'Missing Authorization: Bearer <Firebase ID token>' };
  }

  let data;
  try {
    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${WEB_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token }),
      }
    );
    data = await resp.json();
    if (!resp.ok) {
      const msg = data?.error?.message || `lookup ${resp.status}`;
      return { ok: false, status: 401, error: 'Invalid or expired token: ' + msg };
    }
  } catch (e) {
    return { ok: false, status: 401, error: 'Token verification failed: ' + (e.message || e) };
  }

  const user = Array.isArray(data?.users) ? data.users[0] : null;
  if (!user) {
    return { ok: false, status: 401, error: 'Invalid or expired token' };
  }

  const email = String(user.email || '').trim().toLowerCase();
  if (!email || !isAdminEmail(email)) {
    return { ok: false, status: 403, error: 'Forbidden: not an admin operator' };
  }

  return { ok: true, email, uid: user.localId || '' };
}
