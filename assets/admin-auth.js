/**
 * Phase A operator allowlist (UI + keep in sync with firestore.rules isAdmin()).
 * Interim client guard — real enforcement is Firestore rules. Claims come in Phase B.
 */
export const ADMIN_EMAILS = Object.freeze(['lucaspaye02@gmail.com']);

export function isOperatorEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const normalized = email.trim().toLowerCase();
  return ADMIN_EMAILS.some((allowed) => allowed === normalized);
}
