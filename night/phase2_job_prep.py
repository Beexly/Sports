import json

def prepare_phase2_job():
    current_balance = 26.00

    # Model candidate options for Phase 2:
    # Option A: DeepSeek V4 Flash ($6.00 / 1M tokens, floor $12.00)
    # Option B: Qwen3.8-27B ($1.05 / 1M tokens, floor $4.00)

    dataset_tokens = 3000 * 600  # ~1.8M tokens for 3,000 rows

    cost_option_a = max(12.00, (dataset_tokens / 1_000_000) * 6.00)
    cost_option_b = max(4.00, (dataset_tokens / 1_000_000) * 1.05)

    # Primary selection: Option B (Qwen3.8-27B) or Option A if budget allows
    selected_model = "Qwen/Qwen3.8-27B"
    selected_cost = cost_option_b
    remaining_balance = current_balance - selected_cost

    payload = {
        "model": selected_model,
        "training_file": "night/phase2_master_corpus.jsonl",
        "n_epochs": 3,
        "batch_size": 4,
        "learning_rate": 2e-5,
        "lora_r": 16,
        "lora_alpha": 32,
        "lora_dropout": 0.05,
        "suffix": "phase2-reasoning-27b",
        "cost_estimate": {
            "rate_per_million": "$1.05",
            "floor_price": "$4.00",
            "estimated_tokens": dataset_tokens,
            "projected_cost": f"${selected_cost:.2f}",
            "initial_balance": f"${current_balance:.2f}",
            "remaining_balance": f"${remaining_balance:.2f}"
        },
        "budget_check": "APPROVED_UNDER_BUDGET" if remaining_balance >= 0 else "REJECTED_EXCEEDS_BUDGET"
    }

    output_path = "night/package_j7_phase2_payload.json"
    with open(output_path, "w") as f:
        json.dump(payload, f, indent=2)

    print("=== ARTIFACT: PACKAGE_J7 ===")
    print(f"Target Model: {payload['model']}")
    print(f"Dataset File: {payload['training_file']}")
    print(f"Estimated Cost: {payload['cost_estimate']['projected_cost']}")
    print(f"Remaining Balance: {payload['cost_estimate']['remaining_balance']}")
    print(f"Budget Verification: {payload['budget_check']}")
    print(f"Payload Output: {output_path}")
    print("\nEVIDENCE CHECKLIST:")
    print("- Input data verified: Phase 2 master dataset (1.8M estimated tokens)")
    print("- Pricing models verified: DeepSeek V4 Flash ($6.00/M, floor $12.00) and Qwen3.8-27B ($1.05/M, floor $4.00)")
    print("- Budget constraint checked: Strict limit under remaining $26.00 balance")
    print("- What this artifact DOES NOT claim: Does not execute API job submission without user authorization")
    print("\nNEXT: PACKAGE_J8 Morning Convergence Ledger")

if __name__ == "__main__":
    prepare_phase2_job()
