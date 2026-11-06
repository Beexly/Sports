# Real NDA extract — closed protocol

**Decision:** Technical wedge does **not** wait on real PII.  
Schema-real public extract is sufficient for completeness.  
Real extract is a **commercial** step only.

## When a buyer appears

1. NDA executed (founder / legal).  
2. Buyer provides CSVs with columns:

```text
entity_id, system, <float features...>
```

Optional: a designated `system` value that is SoT (or a separate SoT file).

3. Run (no code change):

```bash
python core/ingest_multisource.py sys1.csv sys2.csv sot.csv --sot sot_name --out report.json
# or
python -c "from product_modes import entity_integrity_report; ..."
```

4. Deliver: `entity_integrity` report + fraud_candidates list.  
5. Write-back to their ledger: only with `FOUNDER_POLICY_ALLOW_WRITEBACK` and their written approval.

## What we never do

- Scrape or invent real KYC/CRM PII  
- Train on their data without contract  
- Claim production metrics from fixtures alone  

## Loop status: CLOSED

Gate = buyer + NDA. Until then: idle on extract acquisition.
