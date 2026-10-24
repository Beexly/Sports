# Model Inventory and Account Setup Report

Run date: 2026-10-08 (Chrome session, fresh tab only; no existing tabs were used for work)

## Summary

- **Alibaba Cloud Model Studio:** No custom or fine-tuned models in any of the six regions. Stop-on-Exhaust was not changed because there is no custom model to apply it to.
- **Together.ai:** Three fine-tuned models found, all from completed LoRA fine-tuning jobs. No dedicated endpoints running. Credits are $18.00, monthly spend is $12.00. Auto-recharge is off and was left off.
- **GitHub (Beexly/agent-bus, main):** Already protected. Nothing changed.
- **Hindsight:** Banks `signal-origin`, `gse`, `framefit`, `desk` created. Existing uppercase `GSE` bank left untouched.

## 1. Alibaba Cloud Model Studio

### Custom / fine-tuned models
Checked My Models in all six regions: Singapore, Hong Kong, Beijing (China North 2), US (Virginia), Frankfurt (Germany), Tokyo (Japan). All show "No Models Available." Models are region-scoped, so if any were trained elsewhere they would appear in one of these. None were found.

Not yet checked: the Fine-tuning jobs page in Singapore returned a 404 from my URL guess, so I did not verify the job list there directly.

### Stop-on-Exhaust
- Custom models: none, so nothing to enable.
- Base models: the Free Quota page lists 33 base models with remaining free quota and 232 with quota exhausted or expired. Each has a "Free Only" (Stop-on-Exhaust) setting, and Batch Settings can change them in bulk. **Not changed.** Turning this on for base models that your services may use in other regions could cause 403 errors once free quota runs out. This needs your decision.

### Quota, expiration, billing
- Free quota is shared across all Singapore workspaces. Specific remaining quota and expiry dates per model were not captured.
- Budgets (account level): **not enabled** for October 2026. Enabling one is a billing change, so I left it.

### API keys
- One key in Singapore: name `HERMES`, ID 1073882, format `sk-ws-H.DMPI...`. Not changed or deleted.

### Free-tier and batch features
- Free quota is the main free feature (see above).
- Batch inference: not checked.

## 2. Together.ai

### Fine-tuned models (from Models > My models)
| Model | Base | Notes |
|---|---|---|
| ft-9fabcf3e-389f (Qwen3.5 9B FP8, 10-04-26) | Qwen3.5-9B | Completed 10/4/2026, 18m 9s, LoRA SFT |
| ft-1f8bc7d5-a098 (Qwen3.5 9B FP8, 10-04-26) | Qwen3.5-9B | Completed 10/4/2026, 17m 39s, LoRA SFT |
| ft-1fe4ef0b-c215 (Qwen3.8 27B, 10-04-26) | Qwen3.8-27B | Completed 10/4/2026, 53m 53s, LoRA SFT |

Each has an adapter model listed alongside. Serverless pricing shows "n/a," which suggests these are not served serverless and would need a dedicated endpoint.

### Endpoints
No dedicated endpoints exist, so no hourly charges are running.

### Billing and caps
- Credits remaining: $18.00. Current monthly spend: $12.00.
- Auto-recharge (automatic credit purchases): **off**. Its dialog showed the opt-in unchecked. I opened it and cancelled without saving.
- Account-level spend alerts: the page only offers auto-recharge thresholds, not usage alerts. Not changed.
- Payment method on file: VISA ending 3857. Not changed.

## 3. GitHub: Beexly/agent-bus

Branch protection rule for `main` already exists (rule ID 84482843). Verified state:
- Require pull request before merging: **on**, 1 approval required.
- Allow force pushes: **off** (blocked).
- Allow deletions: **off** (blocked).

Also noted: "Do not allow bypassing the above settings" is **off**, so repository admins can still bypass these rules. That was not in the request, so I did not change it.

Nothing changed.

## 4. Hindsight (ui.hindsight.vectorize.io)

Banks now present: `desk`, `framefit`, `gse`, `signal-origin` (all empty). Created in this run: all four.

Existing `GSE` (uppercase, empty) was left untouched. It is a separate bank from `gse`. If you want to merge or remove one, that needs your decision.

## Still missing / needs your input

1. **Where are the trained models?** None are on Alibaba (all six regions). Together has three fine-tuned models. If you trained others elsewhere, tell me the platform or region.
2. **Alibaba base-model "Free Only" (Stop-on-Exhaust) for 33 models:** Decide whether to turn it on. It affects services outside Singapore.
3. **Alibaba budgets:** Not enabled for this month. Enabling one is your call.
4. **Together auto-recharge:** Off. Leave it off unless you want automatic card charges.
5. **GitHub admin bypass:** Admins can bypass branch protection. Decide whether to enforce it.
6. **Uppercase `GSE` Hindsight bank:** Empty duplicate of `gse`. Decide whether to keep it.
7. **Alibaba per-model quota and expiry dates:** Not captured in detail.

## Changes made in this run

- Created Hindsight banks: `signal-origin`, `gse`, `framefit`, `desk`.
- No Alibaba settings changed.
- No Together settings changed.
- No GitHub settings changed.
- No deletions.

## Remaining risk

- Alibaba base-model free quota could be exhausted with services continuing to call models in other regions, which may return errors or, if Free Only is not on, be billed.
- Together fine-tuned models are not serverless; they would need dedicated endpoints to serve, which are billed hourly. None are running now.
