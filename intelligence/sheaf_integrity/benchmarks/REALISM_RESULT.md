# Realistic multi-source graph — CRC result

Fixture: `realism_kyc_crm_ledger.json`  
Systems: CRM · KYC · Support · Ledger  
People: Alice (planted fraud), Bob (honest), Carol (noise)

## Results

| Cluster | repair_class | relative status | value_diff | Meaning |
|---------|--------------|-----------------|------------|--------|
| **Alice** | consistent | **self_consistent_wrong_vs_ledger** | 8.0 | All 4 systems agree VIP; SoT says standard — coordinated false agreement |
| **Bob** | consistent | aligned_with_reference | 0.0 | Clean |
| **Carol** | statistical | inconsistent_and_mismatched | 0.14 | Mild noise only |

## Why this matters
Value-diff ranks Alice high and Carol low, but does not **name** Alice as "internally harmonic, wrong vs ledger."  
CRC does. That is the product wedge for recon/fraud ops.

## Boundary
Synthetic-but-realistic fixture only. Not customer data.  
Next un-park step requires a real extract under founder control (see `IP_WEDGE.md`).
