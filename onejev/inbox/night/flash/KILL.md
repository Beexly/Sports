# ADAPTER EXECUTION AND TERMINATION SPECIFICATION (KILL.md)

**Authority:** Adversarial Mathematician (Google Flash 3.8 on Anti-Gravity)  
**Target:** `inbox/night/flash/KILL.md`  
**Execution Mode:** Fail-Closed Autonomous Enforcement

---

## 1. Absolute Kill Triggers

The adapter checkpoint, LoRA weights, and tuned parameter set **MUST BE IMMEDIATELY DELETED** upon the occurrence of ANY of the following three conditions:

### Condition 1: Inferior Risk (Loss of Dominance to Untuned Base)
$$\text{LogLoss}(\mathcal{M}_{\text{adapter}}, \mathcal{D}_{\text{eval}}) > \text{LogLoss}(\mathcal{M}_{\text{base}}, \mathcal{D}_{\text{eval}}) \quad \lor \quad \text{Brier}(\mathcal{M}_{\text{adapter}}, \mathcal{D}_{\text{eval}}) > \text{Brier}(\mathcal{M}_{\text{base}}, \mathcal{D}_{\text{eval}})$$

- **Rule:** If the adapter fails to achieve strictly lower or equal log-loss and Brier score compared to the raw un-adapted foundation base model on the out-of-fold validation set, the adapter represents empirical degradation.
- **Action:** Delete adapter checkpoint immediately. Revert all inference routing to the base foundation checkpoint.

---

### Condition 2: Vacuum Reasoning (Empty CoT / Reasoning Field)
$$\exists \, r \in \mathcal{D}_{\text{train}} \quad \text{such that} \quad \text{len}(\text{trim}(r.\text{reasoning})) = 0 \quad \lor \quad r.\text{reasoning} \text{ is NULL}$$

- **Rule:** Every training record feeding the reasoning spine must contain complete, non-empty, mathematically grounded reasoning traces verifying domain bounds, non-zero denominators, positive variance, and structural consistency.
- **Action:** If even one row exhibits an empty, whitespace-only, or null reasoning chain, the dataset is tainted by unverified assertions. Abort training, wipe the current adapter weights, and purge the corrupted training batch.

---

### Condition 3: Chrome Contamination via Substring Match
$$\exists \, m \in \mathcal{D}_{\text{measurements}} \quad \text{such that} \quad \text{Valid}(m) = \text{True} \quad \text{ONLY via} \quad \text{substring}(\text{"error"}, m) \land \neg \text{HasMeasurementSemantics}(m)$$

- **Rule:** If any measurement row survived filtering or was declared "clean" solely because a crude regex or substring search matched `"error"` inside table headers, markup chrome, or acronyms like `ERO(...)` / `HERO` without explicit point estimates, confidence intervals, standard errors, or dispersion bounds, the measurement dataset is unverified.
- **Action:** Delete the adapter. Halt training. Invalidate the measurement partition until regression suite `gate-regression.jsonl` passes with 100% precision.

---

## 2. Automated Elimination Protocol

When a kill condition fires:

```bash
# 1. Unlink and erase adapter weight artifacts
rm -rf C:/Users/Garrett/onejev/adapters/*
rm -f C:/Users/Garrett/onejev/models/adapter_checkpoint.bin

# 2. Revert local inference routing to untuned base GGUF
# Ensure llama-server / qev serves OneJev-9B.IQ4_XS in pure base mode on port 8000

# 3. Write tombstone receipt
echo '{"timestamp": "2026-10-04T03:14:00Z", "status": "KILLED", "reason": "VIOLATION_OF_KILL_GATE"}' > C:/Users/Garrett/onejev/inbox/night/flash/adapter_tombstone.json
```

---

## 3. Enforcement Declaration

The adversarial mathematician operates fail-closed. No model weights exhibiting inferior calibration, vacuum reasoning, or corrupted measurement chrome are permitted to reach production serving.
