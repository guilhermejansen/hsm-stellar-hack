# Stellar Custody MVP — Comprehensive Code Review

This review summarizes architecture, workflows, module responsibilities, data model, security posture, and concrete issues/risk items observed in the current backend repository. All observations are based on the code under `apps/backend` and Prisma schema.

## Architecture Overview

- NestJS monolith with modular organization:
  - HSM integration: `apps/backend/src/hsm/*`
  - Multi‑sig guardians: `apps/backend/src/guardians/*`
  - Authentication (JWT + TOTP): `apps/backend/src/auth/*`
  - OCRA‑like challenges: `apps/backend/src/challenges/*`
  - Transactions + ephemeral keys: `apps/backend/src/transactions/*`, `apps/backend/src/wallets/*`
  - WhatsApp notifications: `apps/backend/src/whatsapp/*`
  - mTLS scaffolding: `apps/backend/src/mtls/*`
  - DB gateway: `apps/backend/src/database/*` (Prisma)
  - Common services: `apps/backend/src/common/*`

## Data Model (Prisma)

- Users and Guardians with 1:1 relation; guardians carry TOTP, limits, and approval stats.
- Wallet hierarchy implements BIP32 intent: Cold (master) and Hot (derived) via `parentWalletId` link.
- Ephemeral `TransactionKey` (unique address per transaction) for privacy.
- Transaction carries multi‑sig requirement, approvals, optional challenge, and result metadata.
- Challenge and ChallengeResponse tables support OCRA‑like flow.
- Certificates table for mTLS (currently mocked).

## Security Posture

- Strong intent: HSM‑only signing, TOTP for key release, OCRA‑like challenge response, audit logging, mTLS, and WhatsApp out‑of‑band notifications.
- Current implementation uses several mock paths; critical checks are present but some are bypassed or in insecure default modes (see Issues).

## Module Reviews & Findings

### HSM Service (`apps/backend/src/hsm/hsm.service.ts`)
- Provides mock endpoints for partition creation, AES and BIP32 keys, key release authorization, and signatures. Audits are consistently logged through `AuditService`.
- Good separation of concerns and rich metadata for audit entries.
- Risk: Because `authorizeKeyReleaseAndSign()` accepts a raw string `totpCode`, upstream callers can (and currently do) pass a hardcoded value (see Transactions section). The API should accept a validated `keyReleaseId` issued by the challenge/TOTP step and refuse raw codes.

### Guardian Service/Controller (`apps/backend/src/guardians/*`)
- Registration triggers KYC, HSM partition, TOTP setup (QR+backup codes), wallet hierarchy creation.
- Activation validates first TOTP and flips `hsmActivated`.
- Good logging and guardrails on status changes (e.g., minimum active guardians).
- Suggestion: explicitly handle failure rollback for partially created resources during registration.

### Auth (`apps/backend/src/auth/*`)
- Login issues a short‑lived session JWT; TOTP verification upgrades to access JWT.
- Replay prevention using an in‑memory `Set` with TTL.
- Risk: Development bypass (`BYPASS_TOTP_IN_TESTS=true`) and acceptance of `123456` in dev mode. Ensure this cannot be enabled in production or default to disabled.
- Suggestion: Persist TOTP replay prevention in DB/Redis for multi‑instance deployments.

### Challenges (`apps/backend/src/challenges/challenge.service.ts`)
- Generates short display challenges and stores full context with Redis+DB, 5‑min TTL.
- Validates responses as either OCRA‑like or fallback TOTP.
- Issues:
  1) Contextual secret composition for OCRA: `guardianTotpSecret + sha256(fullChallenge)[0..8]` is not base32 and will cause verification problems with `otplib` (expects base32 secret). Should derive a base32 secret (e.g., HMAC bytes → base32) instead of string concatenation.
  2) UI masking uses `substring(-8)`, which returns from index 0; should use `slice(-8)`.

### Transactions (`apps/backend/src/transactions/transaction.service.ts`)
- Threshold selection: 2‑of‑3 or 3‑of‑3 based on wallet type and amount.
- Creates reservation and an ephemeral transaction key via `TransactionKeyService`.
- Approvals record guardian signature metadata and determine execution readiness.
- Issues:
  1) Line refs: `apps/backend/src/transactions/transaction.service.ts:513` and `:600` hard‑code the TOTP string "123456" when calling HSM, ignoring the validated response and `keyReleaseId`. This bypasses the guardian challenge/TOTP policy.
  2) Submission to Stellar currently mocked; fine for dev but should be gated by env and provide a safe error if executed without network.
  3) The raw transaction uses JSON→hex as a placeholder; production must replace with a real XDR envelope and signing.

### Wallets & Ephemeral Keys (`apps/backend/src/wallets/*`)
- Implements Cold/Hot hierarchy and ephemeral m/0'/0'/N' keys with strict 1‑to‑1 mapping to Transaction and auto‑destroy semantics.
- Good audit coverage (generation, signing, destroy).
- Check: Ensure background revocation for expired keys is invoked on schedule (service defines generation/usage, but destruction relies on explicit call or auto‑destroy semantics inside HSM mock).

### WhatsApp (`apps/backend/src/whatsapp/*`)
- Integrates with ZuckZapGo for text, buttons, stickers; assembles approval CTA URLs.
- Issue: Defaults to production host and token if not configured, which risks accidental calls to a real provider in misconfigured environments.
- Suggestion: Fail fast when missing envs; provide explicit `WHATSAPP_ENABLED` guard; require non‑default token in prod.

### mTLS (`apps/backend/src/mtls/*`)
- Mocked certificate issuance and validation. Properly gated by `MTLS_ENABLED`.
- Suggestion: ensure all sensitive routes actually check client cert when enabled; consider pinning and policy storage.

### Database (`apps/backend/src/database/*`)
- Robust connection lifecycle and health checks. Uses query logging in dev.
- Suggestion: Add Prisma middleware for audit trails and PII redaction at query level.

### Common (`apps/backend/src/common/*`)
- `EncryptionService` enforces a 64‑hex char key for AES‑GCM; good default.
- `AuditService` logs to console but does not persist events to DB. This undermines the "complete audit trail" requirement.

## Priority Issues & Risks

1) Hardcoded TOTP in HSM signature calls (critical bypass)
   - Files: `apps/backend/src/transactions/transaction.service.ts:513`, `:600`
   - Impact: Approvals can be faked; defeats multi‑sig controls.

2) OCRA contextual secret not base32 (challenge validation unreliable)
   - File: `apps/backend/src/challenges/challenge.service.ts:223`
   - Impact: OCRA verification may always fail; falls back to plain TOTP.

3) Destination masking bug (`substring(-8)`) in challenge display
   - File: `apps/backend/src/challenges/challenge.service.ts:381`
   - Impact: Privacy hint incorrect; shows full address.

4) Audit events not persisted
   - File: `apps/backend/src/common/audit.service.ts`
   - Impact: No durable audit; compliance/gov cannot be met.

5) KYC encrypted PII mis-stored
   - File: `apps/backend/src/kyc/kyc.service.ts:163`
   - Issue: Stores `hsmPartition.partitionId` in `encryptedPII` instead of the Svault‑encrypted payload.

6) Third‑party defaults risk (WhatsApp/HSM)
   - Files: `apps/backend/src/whatsapp/whatsapp.service.ts` (token/host defaults), HSM mocks
   - Impact: Accidental calls to real services and credential leakage.

## Recommendations

- Require and propagate `keyReleaseId` from challenge/TOTP validation to HSM signature methods; drop acceptance of raw codes.
- Implement a proper OCRA‑like derivation: compute `HMAC(secret, fullChallenge)` → base32‑encode → verify; keep a compatibility path for plain TOTP if configured.
- Fix masking `substring(-8)` → `slice(-8)`; add unit tests for formatting helpers.
- Add `AuditLog` Prisma model and persist all audit events with retention policy. Consider a separate store (SIEM) for production.
- Store real Svault‑encrypted PII blob in `encryptedPII`; keep partition IDs in dedicated columns.
- Introduce `WHATSAPP_ENABLED` and `HSM_MOCK=true/false` flags; fail fast without explicit consent in production.
- Replace JSON→hex signing with real Stellar XDR building/signing in `StellarService` and wire submission through Horizon in non‑mock mode.

## Testability & Observability

- Add unit tests for challenge derivation, TOTP replay, and ephemeral key lifecycle.
- Add health endpoints to surface Redis/WhatsApp availability and HSM connectivity (mock/real).
- Expand `monitoring` to export Prometheus metrics (approval latency, failed challenges, key destroy counts).

## Frontend Note

- The `apps/frontend` directory is empty; ensure the approval UI referenced in WhatsApp CTA exists before enabling the button flows in production.

