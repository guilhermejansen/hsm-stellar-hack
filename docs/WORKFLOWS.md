# Stellar Custody MVP — End‑to‑End Workflows

This document describes the principal system workflows from onboarding to transaction execution with multi‑sig approvals and privacy‑preserving ephemeral keys.

## 1) KYC + HSM Partition Provisioning

1. Client submits KYC (PII + documents) to `KYCService.submitKYC()`.
2. `HSMService.createUserWithKYC()`
   - Creates HSM partition, AES‑256 key for PII, master BIP32 key.
   - Svault‑encrypts PII; returns partition/key identifiers.
3. `KYCService` hashes password and creates `User`, storing encrypted PII and HSM identifiers.
4. KYC moves to UNDER_REVIEW or is auto‑approved (demo) via `KYCService.approveKYC`.

## 2) Guardian Registration & Activation

1. Admin calls `GuardianService.registerGuardian()` with user info and role (CEO/CFO/CTO).
2. Service:
   - Ensures role uniqueness and active constraints.
   - Generates guardian TOTP secret + QR + backup codes.
   - Creates wallet hierarchy via `WalletService.createWalletHierarchy()` (Cold m/0' + Hot m/0'/0').
3. WhatsApp sends TOTP setup (QR) to guardian.
4. Guardian activates with first TOTP: `GuardianService.activateGuardian()` sets `totpVerified` and `hsmActivated`.

## 3) Login + TOTP Upgrade

1. `AuthService.login()` validates email/password and issues short‑lived session JWT.
2. `AuthService.verifyTOTP()` validates 6‑digit TOTP and prevents replay.
3. `AuthService.generateAccessToken()` issues 24‑hour access JWT with guardian context.

## 4) Transaction Creation (with Privacy)

1. Client calls `TransactionService.createTransaction()` with fromWalletId, destination G..., amount, memo.
2. Service validates request, computes threshold scheme (2/3 or 3/3), and creates DB record.
3. `TransactionKeyService.generateEphemeralTransactionKey()` derives m/0'/0'/N' in HSM and stores the ephemeral address and key metadata (1‑to‑1 with the transaction).
4. If low‑value (no approvals), `executeTransactionWithEphemeralKey()` proceeds immediately (still private).

## 5) Multi‑Sig Approvals (High‑Value)

1. For high‑value or critical flows, `ChallengeService.generateTransactionChallenge()` creates a short challenge (16 chars), stores context, and expires in 5 minutes.
2. WhatsApp sends the approval CTA (button with URL) and challenge to each guardian.
3. Guardian responds with a 6‑digit code from the authenticator app using either:
   - OCRA‑like derivation (preferred), or
   - Plain TOTP fallback (configurable).
4. `ChallengeService.validateChallengeResponse()` verifies and returns a `keyReleaseId` representing the authorization to sign.

## 6) HSM Sign + Broadcast

1. With sufficient approvals, `TransactionService.getHSMSignatureForTransaction()` (should) pass the `keyReleaseId` to HSM for signing.
2. For privacy, `executeTransactionWithEphemeralKey()` builds a transaction envelope with the ephemeral address as the source and requests `TransactionKeyService.useEphemeralKeyForSigning()`.
3. After signing, the ephemeral key is destroyed (ONE‑TIME USE); transaction is submitted to Stellar.
4. On success, balances update, audits log, and WhatsApp can send a success sticker.

## 7) Auditing & Monitoring

1. All major actions log via `AuditService` with rich metadata (guardian, partition, challenge). Persist these logs in DB/SIEM in production.
2. Health checks cover DB, Redis, WhatsApp, and (mock/real) HSM endpoints.

