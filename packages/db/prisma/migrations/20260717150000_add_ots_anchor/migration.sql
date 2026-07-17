-- OpenTimestamps anchoring for slate commitments (W-OTS): stores the detached
-- .ots proof bytes for the published Merkle root, and the Bitcoin block height
-- once the proof upgrades to a real Bitcoin block-header attestation.
-- See packages/crypto/src/ots-anchor.ts (serializer byte-identical to the
-- python-opentimestamps reference; live calendar round-trip verified
-- 2026-07-17) and docs/frontier/WORKSTREAM_OTS_ANCHOR.md.
--
-- Purely additive, nullable, IF NOT EXISTS end to end — byte-safe to apply or
-- re-apply anytime (same hardening doctrine as 20260717120000_add_watchlist).
-- The founder applies this; nothing runs it automatically. Writers are further
-- gated behind OTS_ANCHOR_ENABLED (default off).

ALTER TABLE "slate_commitments" ADD COLUMN IF NOT EXISTS "otsProof" BYTEA;
ALTER TABLE "slate_commitments" ADD COLUMN IF NOT EXISTS "otsBitcoinHeight" INTEGER;
