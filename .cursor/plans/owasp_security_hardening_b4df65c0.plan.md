---
name: OWASP Security Hardening
overview: Audit and harden the MosaikWeb Next.js application against the OWASP Top 10 2021, addressing critical vulnerabilities in file uploads, input sanitization, access control, security headers, rate limiting, and logging across server actions, middleware, and configuration.
todos:
  - id: security-utils
    content: Create lib/security.ts with escapeHtml(), validateUploadFile(), sanitizeFilename() utilities
    status: completed
  - id: rate-limit
    content: Create lib/rate-limit.ts with in-memory sliding window rate limiter
    status: completed
  - id: audit-log
    content: Create lib/audit.ts with structured audit logging utility
    status: completed
  - id: security-headers
    content: Add security headers, fix image remotePatterns, reduce bodySizeLimit in next.config.ts
    status: completed
  - id: file-upload-validation
    content: Add file type, MIME type, and size validation to lib/uploadImages.ts and actions/uploadProductImage.ts
    status: completed
  - id: email-xss
    content: Escape HTML in email template in actions/placeOrder.ts and add rate limiting
    status: completed
  - id: access-control-fixes
    content: Fix addHeroImage auth, validate lookbook href, fix checkout success IDOR
    status: completed
  - id: rate-limit-actions
    content: Apply rate limiter to validatePromoCode and toggleWishlist
    status: completed
  - id: audit-logging-actions
    content: Add audit logging to all admin-mutating server actions (12 files)
    status: completed
isProject: false
---

# OWASP Top 10 Security Hardening Plan

## Audit Summary

After reviewing all server actions, middleware, configuration, schema, and client components, here are the findings mapped to each OWASP category and the remediation plan.

---

## A01: Broken Access Control

**Findings:**

- `addHeroImage()` in [actions/hero.ts](actions/hero.ts) (line 28) is exported with **no auth check**. While it's called internally by `addHeroImageFromFile` (which checks auth), any client can import and call it directly.
- `validatePromoCode()` in [actions/promo.ts](actions/promo.ts) (line 92) has **no auth check**, allowing unauthenticated users to probe/brute-force promo codes.
- The checkout success page at [app/checkout/success/page.tsx](app/checkout/success/page.tsx) displays `orderId` from the URL query parameter with **no ownership verification** (IDOR -- anyone can guess order IDs).
- `updateLookbookItem()` in [actions/lookbook.ts](actions/lookbook.ts) (line 70) accepts an arbitrary `href` string without validating it's a safe URL (could be `javascript:` URI).

**Fixes:**

- Add admin auth check to `addHeroImage()` or make it non-exported (internal only).
- Add basic rate-limiting awareness to `validatePromoCode()` (see A04 below).
- On checkout success page, either verify the order belongs to the current user/session or only show a generic confirmation without the order ID.
- Validate `href` in `updateLookbookItem()` and `addLookbookItemFromFile()` to only allow relative paths or `https://` URLs.

---

## A02: Cryptographic Failures

**Findings:**

- `.env.local` contains live secrets (DB password, Clerk secret key, Supabase service role key, Resend API key). It is gitignored via `.env*` pattern and was never committed -- **no action needed**, but worth noting.
- PII (customer name, phone, address, email) is stored in the `orders` table as plaintext. For a COD e-commerce site this is standard, but worth being aware of.

**Fixes:**

- No code changes needed. Document that secrets must never be committed, and consider rotating keys periodically.

---

## A03: Injection

**Findings:**

- **SQL Injection**: All queries use Drizzle ORM parameterized queries. No raw SQL in production code. **No risk.**
- **XSS via Email**: In [actions/placeOrder.ts](actions/placeOrder.ts) (lines 202-211), `customerName`, `addressLine1`, and `city` are interpolated directly into an HTML email template string **without escaping**. An attacker could submit `<script>alert(1)</script>` as their name and it would be rendered in the confirmation email HTML.
- **No `dangerouslySetInnerHTML`** found anywhere. React's default escaping handles frontend XSS. **No risk.**

**Fixes:**

- Create a simple `escapeHtml()` utility and apply it to all user-provided values before interpolating into the email HTML template in `placeOrder.ts`.

---

## A04: Insecure Design (Rate Limiting)

**Findings:**

- **No rate limiting** on any server action: `placeOrder`, `validatePromoCode`, `toggleWishlist`, file uploads, admin actions.
- Promo codes can be brute-forced (short codes like "SALE20" are easily guessable).
- No order quantity/frequency limits per user or session.

**Fixes:**

- Implement a lightweight in-memory rate limiter utility (e.g., sliding window using `Map`) in [lib/rate-limit.ts](lib/rate-limit.ts).
- Apply it to the most critical actions:
  - `placeOrder` -- max ~5 orders per IP/user per hour
  - `validatePromoCode` -- max ~10 attempts per IP per minute
  - `toggleWishlist` -- max ~30 per user per minute
- For production, document that a Redis-based limiter (e.g., `@upstash/ratelimit`) should replace the in-memory version for multi-instance deployments.

---

## A05: Security Misconfiguration

**Findings:**

- [next.config.ts](next.config.ts) has **no security headers** configured (no CSP, X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security, Referrer-Policy, Permissions-Policy).
- `bodySizeLimit: "10mb"` is generous -- could allow abuse.
- `images.remotePatterns` only allows `images.pexels.com` but Supabase storage URLs are also used -- images may break or bypass the allowlist.

**Fixes:**

- Add a `headers()` configuration to `next.config.ts` with:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (for production)
  - A baseline `Content-Security-Policy`
- Add Supabase hostname to `images.remotePatterns`.
- Reduce `bodySizeLimit` to `"4mb"` (sufficient for image uploads).

---

## A06: Vulnerable and Outdated Components

**Findings:**

- Dependencies look reasonably current. No known critical CVEs in the listed versions at this time.

**Fixes:**

- Add an `npm audit` step and document running it periodically.
- No immediate code changes needed.

---

## A07: Identification and Authentication Failures

**Findings:**

- Clerk handles auth, session management, and password policies well. **No issues.**
- Guest checkout is intentional. **No changes needed.**

**Fixes:**

- No code changes needed.

---

## A08: Software and Data Integrity Failures -- File Upload Validation

**Findings (CRITICAL):**

- [lib/uploadImages.ts](lib/uploadImages.ts) and [actions/uploadProductImage.ts](actions/uploadProductImage.ts) accept **any file type**. The extension is derived from `file.name.split(".").pop()` which is fully client-controlled. An attacker could upload `.html`, `.svg` (with embedded JavaScript), `.exe`, or any other file type.
- `file.type` (used as `contentType`) is also client-provided and can be spoofed.
- **No file size validation** beyond the 10mb server action limit.
- The local fallback in `uploadImages.ts` writes files directly to the `public/` directory, making them immediately accessible and potentially executable.

**Fixes:**

- Create an `ALLOWED_EXTENSIONS` and `ALLOWED_MIME_TYPES` allowlist (e.g., `jpg`, `jpeg`, `png`, `gif`, `webp` for images; `mp4`, `webm` for video).
- Validate both the file extension and MIME type against the allowlist **before** uploading.
- Add a per-file size limit (e.g., 5MB for images, 50MB for video).
- Sanitize the filename to strip path traversal characters (`..`, `/`, `\`).
- Apply these validations in a shared `validateUploadFile()` utility used by all upload functions.

---

## A09: Security Logging and Monitoring Failures

**Findings:**

- Only two `console.error` calls in all actions (email send failure and upload error).
- No audit trail for admin actions (product create/delete, order status changes, promo code management).
- No structured logging.

**Fixes:**

- Create a lightweight `auditLog()` utility in [lib/audit.ts](lib/audit.ts) that logs admin actions with timestamp, userId, action, and target resource.
- Initially log to `console.log` with a structured JSON format (can be routed to a logging service later).
- Add audit logging calls to all admin-mutating server actions: `createProduct`, `updateProduct`, `deleteProduct`, `createCategory`, `updateCategory`, `deleteCategory`, `updateOrderStatus`, `applyBulkDiscount`, `removeBulkDiscount`, `createPromoCode`, `deletePromoCode`, `togglePromoStatus`.
- Log failed auth attempts (when non-admin tries to access admin actions).

---

## A10: Server-Side Request Forgery (SSRF)

**Findings:**

- No user-controlled URLs are fetched server-side. **No SSRF risk.**

**Fixes:**

- No changes needed.

---

## Files to Create

- `lib/security.ts` -- `escapeHtml()`, `validateUploadFile()`, `sanitizeFilename()` utilities
- `lib/rate-limit.ts` -- In-memory rate limiter
- `lib/audit.ts` -- Audit logging utility

## Files to Modify

- `next.config.ts` -- Security headers, image remote patterns, reduced body size limit
- `lib/uploadImages.ts` -- Add file type/size validation to all upload functions
- `actions/uploadProductImage.ts` -- Add file type/size validation
- `actions/placeOrder.ts` -- Escape HTML in email template, add rate limiting
- `actions/promo.ts` -- Add rate limiting to `validatePromoCode`
- `actions/hero.ts` -- Add auth check to `addHeroImage` or unexport it
- `actions/lookbook.ts` -- Validate `href` URL, add audit logging
- `actions/categories.ts` -- Add audit logging
- `actions/createProduct.ts` -- Add audit logging
- `actions/updateProduct.ts` -- Add audit logging
- `actions/deleteProduct.ts` -- Add audit logging
- `actions/updateOrderStatus.ts` -- Add audit logging
- `actions/bulk-discount.ts` -- Add audit logging
- `actions/video.ts` -- Add audit logging
- `actions/toggleWishlist.ts` -- Add rate limiting
- `app/checkout/success/page.tsx` -- Remove order ID exposure or add ownership check

