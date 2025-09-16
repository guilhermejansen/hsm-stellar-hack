# Commit Plan — By Module (Conventional Commits)

This plan lists focused, review‑driven commits to align the implementation with the documented architecture, strengthen security controls, and improve observability. Each item includes intent, rationale, and affected files.

Note: Items labeled (breaking) or (migration) require coordination across modules and/or Prisma migrations.

## 1) HSM + Transactions (Key Release + Signing)

feat(hsm): accept keyReleaseId for signing instead of raw TOTP
- Why: Prevent bypass by requiring pre‑validated authorization tokens from challenge/TOTP.
- What: Update `authorizeKeyReleaseAndSign` signature to accept `{ releaseId }` or `{ totpCode }` with precedence for `releaseId`; audit both.
- Files:
  - apps/backend/src/hsm/hsm.service.ts

fix(transactions): remove hardcoded TOTP and propagate keyReleaseId
- Why: Enforce end‑to‑end approval integrity.
- What: In `TransactionService.getHSMSignatureForTransaction()`, pass the `keyReleaseId` returned by `ChallengeService.validateChallengeResponse()` and forbid literals like "123456". Wire through approval path to carry the id.
- Files:
  - apps/backend/src/transactions/transaction.service.ts

refactor(approvals): store keyReleaseId on approval and reuse on submit
- Why: Keep an auditable link between challenge validation and HSM signing.
- What: Ensure `keyReleaseId` is persisted alongside `hsmSignature` fields; surface in audit logs.
- Files:
  - apps/backend/prisma/schema.prisma (if additional fields needed)
  - apps/backend/src/transactions/transaction.service.ts

## 2) Challenges (OCRA‑like)

fix(challenges): derive base32 contextual secret for OCRA validation
- Why: `otplib` expects base32 secrets; concatenating hex breaks verification.
- What: Build `contextualSecret = base32encode(HMAC-SHA1(totpSecretBytes, fullChallengeBytes))` and verify; keep plain TOTP fallback.
- Files:
  - apps/backend/src/challenges/challenge.service.ts

fix(challenges): correct destination masking in display
- Why: `substring(-8)` returns from index 0; use `slice(-8)`.
- Files:
  - apps/backend/src/challenges/challenge.service.ts

test(challenges): add unit tests for OCRA derivation and masking
- Files:
  - apps/backend/test/challenge.spec.ts (new)

## 3) Audit Trail

feat(audit): persist audit events (migration)
- Why: Fulfill “complete audit trail” requirement beyond console logs.
- What: Add `AuditLog` model (action, resource, result, userId, ip, ua, metadata JSONB, timestamps). Update `AuditService.logEvent` to `create` with batching in future.
- Files:
  - apps/backend/prisma/schema.prisma (new model)
  - apps/backend/src/common/audit.service.ts

chore(audit): redact sensitive fields in metadata
- Why: Avoid leaking tokens/codes in logs.
- Files:
  - apps/backend/src/common/audit.service.ts

## 4) KYC + PII

fix(kyc): store Svault‑encrypted PII in `encryptedPII`
- Why: Presently stores `hsmPartition.partitionId` instead of encrypted payload.
- Files:
  - apps/backend/src/kyc/kyc.service.ts

## 5) WhatsApp Integration

feat(whatsapp): add WHATSAPP_ENABLED and safe defaults
- Why: Prevent unintended calls to production with default token.
- What: Fail fast unless `WHATSAPP_ENABLED=true` and non‑default `WHATSAPP_TOKEN` present.
- Files:
  - apps/backend/src/whatsapp/whatsapp.service.ts

## 6) Auth Hardening

feat(auth): disable dev TOTP bypass by default
- Why: Reduce footguns in non‑test environments.
- What: Make `BYPASS_TOTP_IN_TESTS` default to false; require explicit enable.
- Files:
  - apps/backend/src/auth/auth.service.ts

## 7) Ephemeral Keys Lifecycle

feat(wallets): scheduled cleanup for expired ephemeral keys
- Why: Ensure keys marked as expired are destroyed; keep privacy guarantees.
- What: Add `@Cron` task to iterate expired keys, call `HSMService.destroyEphemeralKey`, and update DB.
- Files:
  - apps/backend/src/wallets/transaction-key.service.ts

## 8) Stellar Integration

feat(stellar): introduce XDR transaction builder
- Why: Replace JSON→hex placeholder with real XDR envelope and signature verification.
- Files:
  - apps/backend/src/stellar/stellar.service.ts
  - apps/backend/src/transactions/transaction.service.ts (integration)

## 9) Observability & Monitoring

feat(monitoring): add Prometheus metrics for approvals/challenges
- Why: Ops visibility into security controls and latencies.
- Files:
  - apps/backend/src/common/monitoring.controller.ts (or dedicated module)

## 10) Documentation & Safety Rails

docs(security): document HSM mock vs real modes
- Files:
  - docs/HSM_SETUP.md (update)

docs(ops): runbooks for challenge failures and WhatsApp outages
- Files:
  - docs/OPERATIONS.md (new)

---

## Suggested Commit Ordering

1. fix(transactions): remove hardcoded TOTP and propagate keyReleaseId
2. feat(hsm): accept keyReleaseId for signing instead of raw TOTP
3. fix(challenges): derive base32 contextual secret for OCRA validation
4. fix(challenges): correct destination masking in display
5. feat(audit): persist audit events (migration)
6. fix(kyc): store Svault‑encrypted PII in encryptedPII
7. feat(whatsapp): add WHATSAPP_ENABLED and safe defaults
8. feat(auth): disable dev TOTP bypass by default
9. feat(wallets): scheduled cleanup for expired ephemeral keys
10. feat(stellar): introduce XDR transaction builder
11. feat(monitoring): add Prometheus metrics for approvals/challenges
12. docs(security|ops): update guides and runbooks

