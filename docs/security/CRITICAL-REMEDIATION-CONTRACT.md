# Ducor Pharmacy — Critical remediation contract

**Status:** Architecture accepted (AppSec ↔ Security Architecture).  
**Repo:** `Geejorgbor/ducor-pharmacy`  
**Audience:** Nadia (implementation), Marcus (platform), Amina (AppSec review), Viktor (architecture).  
**Rule:** One trust boundary. No “client create + server update” mix on orders. No reincarnation of client-side passwords or promo tables.

Remediation PRs are held until Lucas greenlights emergency go/no-go. After yes, each PR is AppSec-reviewed against this contract before merge.

Implementation order: **1 → 5** (below).

---

## Claims

| Claim | Type | Who gets it | Purpose |
|-------|------|-------------|---------|
| `admin` | boolean `true` | Controlled admin accounts only | Dashboard, admin_state, order status/payment admin updates, admin APIs |
| `preview` | boolean `true` | Owner/preview accounts (or reuse `admin`) | Owner preview access; replaces static preview keys |

Issue claims only via Admin SDK / controlled Cloud Function. Do **not** hardcode admin emails in Firestore rules long-term; migrate `isAdmin()` to `request.auth.token.admin == true`.

---

## 1) Custom claims issuer

- One controlled Admin script or Cloud Function sets `admin` / `preview`.
- Revoke by clearing claims and forcing token refresh.
- MFA required on every account that receives `admin`.

---

## 2) Orders — server-only create + token-hash confirms

### Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/orders` | Optional Anonymous Firebase ID token (session bind) **or** none only if create is fully server-rate-limited and returns capability | Create order via Admin SDK |
| `GET` | `/api/orders?ref=…` | Public, rate-limited | Track by order ref (prefer over open client `get`) |
| `POST` | `/api/orders/:id/confirm-delivery` | Body `{ "token": "<raw confirmToken>" }` | Guest delivery confirm |
| `POST` | `/api/orders/:id/confirm-payment` | Bearer + `admin` claim **or** boss-capable server path | Payment confirmed |
| `PATCH` | `/api/orders/:id/status` | Bearer + `admin` claim | Status transitions |

### Token-hash rules

1. On create, server generates `confirmToken` ≥ 32 random bytes (CSPRNG).
2. Persist **only** `confirmTokenHash = SHA-256(rawToken)` (hex or raw bytes). Never store or log the raw token.
3. Return raw token once (create response + email/WhatsApp secret links).
4. Confirm endpoints: hash presented token; compare to `confirmTokenHash` with **constant-time** equality.
5. Order document IDs must be cryptographically unguessable (128-bit+). No sequential IDs.

### Firestore rules (target)

- `orders`: **deny** client `create` / `update` / `delete`.
- Reads: prefer deny client reads; if a temporary client listener remains, it must not enable enumeration (unguessable IDs only) and must be removed once `GET /api/orders` ships.
- All writes go through Admin SDK in the APIs above.

### Field allowlists (server-enforced on update)

Only these keys may change after create (same spirit as current rules):

- `status`, `statusUpdatedAt`, `confirmToken` (only if rotating — prefer hash field `confirmTokenHash`), `deliveredAt`, `confirmedByCustomer`, `paymentConfirmed`, `paymentConfirmedAt`, `adminNote`

**Never** allow client or guest-token paths to change: price, items, buyer identity, collector, totals, promo application.

---

## 3) Remoting APIs — ID token or cron secret

Shared middleware:

1. Browser/admin routes: `Authorization: Bearer <Firebase ID token>` → verify signature/project → read claims.
2. Machine/cron routes: `x-cron-secret` (or equivalent) must equal server env secret (same pattern as `/api/cron/post-group-update`).
3. CORS is not auth. Keep origin allowlist for browsers; still require (1) or (2).

| Route | Auth | Hard requirements |
|-------|------|-------------------|
| `/api/send-email` | Bearer (customer session bound to order) **or** admin claim **or** cron secret | Keep `type` allowlist; no arbitrary `to` spam |
| `/api/send-sms` | Bearer or cron secret | **Server generates OTP**; store hash + expiry + attempts; **reject client-supplied `code`** |
| `/api/chat` | Bearer (anonymous OK for public widget, rate-limited) | **Drop** client `isAdmin` and `customSystem`; admin prompt is server-fixed only |
| `/api/whatsapp` | Bearer + `admin` for admin actions; order-create path server-only; cron secret for jobs | Remove diagnostic types (`check_status`, `list_groups`, one-shot announcement types) |

---

## 4) Promo validation — server-only

- Delete promo code tables/logic from `checkout.html` (and any other static page).
- Store codes in Firestore (`promos/{code}` or admin-only collection). Client SDK: deny read/write.
- Validate in `POST /api/orders` or `POST /api/promo/validate` with Admin SDK: active, expiry, min cart, usage limits.
- **Server returns** discounted totals. Client never decides final price.

---

## 5) Preview / upload — Auth + claims (no client passwords)

- Remove static password/key checks from `preview-access.html`, `upload.html`, and any similar pages.
- Gate with Firebase Auth + `preview` or `admin` claim (HttpOnly Secure session cookie via small `/api/preview-session` **or** verify ID token on protected routes).
- **Burned secrets:** any previously embedded preview keys or client-side upload passwords are burned. Rotate on deploy. **Do not republish those values** in chat, commits, or this doc.
- Clear old preview cookies on deploy (change cookie name).

---

## Do not reincarnate

- ❌ Client-side promo code lists or “secret” discount strings in HTML/JS  
- ❌ Shared passwords / URL keys for preview or upload  
- ❌ Client Firestore `create`/`update` on `orders`  
- ❌ Client-supplied `isAdmin`, `customSystem`, or SMS OTP `code`  
- ❌ Trusting CORS alone on remoting APIs  
- ❌ Re-adding temporary WhatsApp diagnostic endpoints without auth + time-box  

---

## AppSec merge bar

Amina reviews each remediation PR against this file. Merge only if:

1. Endpoint auth matches the table above.  
2. Orders have a single server trust boundary + token-hash confirms.  
3. Claims are `admin` / `preview` as specified.  
4. Field allowlists held.  
5. No client passwords/promos returned.

---

## Out of scope here (track separately)

Firestore `analytics_*` open writes, backup/restore drills, branch protection, and secret scanning remain on the broader architecture checklist; not required to close Criticals 1–6 if Amina’s Critical set is API/rules/auth only — confirm with AppSec if those are in Criticals 5–6.
