-- WP-5 store-credit mints (pack protection rule).
-- Apply once against the Neon ledger database (parent owns DB writes):
--   neon psql main --project-id summer-brook-99380762 -- -f store-credit-mints.sql
-- The UNIQUE constraint is the cross-process double-mint guard; the app
-- adapter inserts with ON CONFLICT DO NOTHING (first mint wins, forever).
CREATE TABLE IF NOT EXISTS public.store_credit_mints (
  purchase_id         TEXT        NOT NULL,
  slate_key           TEXT        NOT NULL,
  pack_price_cents    INTEGER     NOT NULL CHECK (pack_price_cents >= 0),
  net_units           DOUBLE PRECISION NOT NULL,
  credit_back_cents   INTEGER     NOT NULL CHECK (credit_back_cents >= 0),
  upgrade_credit_cents INTEGER    NOT NULL CHECK (upgrade_credit_cents >= 0),
  choice              TEXT        NOT NULL CHECK (choice IN ('store-credit', 'upgrade-credit')),
  granted_cents       INTEGER     NOT NULL CHECK (granted_cents >= 0),
  minted_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT store_credit_mints_pkey PRIMARY KEY (purchase_id, slate_key)
);

COMMENT ON TABLE public.store_credit_mints IS
  'WP-5: one mint per (purchase_id, slate_key). Pack net <= 0.00u on the credit-back tier mints 100% of the pack price as store credit, or a flat $35 upgrade credit toward Door 1. First mint wins; never overwritten.';