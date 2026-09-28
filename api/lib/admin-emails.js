/**
 * Server-side operator allowlist — MUST stay in sync with:
 *   - assets/admin-auth.js ADMIN_EMAILS
 *   - firestore.rules isAdmin()
 * Phase A: single operator.
 */
export const ADMIN_EMAILS = Object.freeze(['lucaspaye02@gmail.com']);

export function isAdminEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const normalized = email.trim().toLowerCase();
  return ADMIN_EMAILS.some((allowed) => allowed === normalized);
}
