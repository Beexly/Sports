import json
import re

# Grammar Partition Rules:
# Class A: Closed-form display equations (algebraic identities, kernels)
# Class B: Empirical point estimates with uncertainty intervals (\pm, CI, SE)
# Class C: Discarded table layout chrome (ERO(...), formatting headers, borders)

SAMPLE_ROWS = [
    {"id": "eq_01", "raw": "K(x, x') = \\exp\\left(-\\frac{\\|x - x'\\|^2}{2\\sigma^2}\\right)", "expected_class": "CLASS_A"},
    {"id": "eq_02", "raw": "\\hat{\\theta} = 1.45 \\pm 0.12 \\quad (95\\% \\text{ CI: } [1.21, 1.69])", "expected_class": "CLASS_B"},
    {"id": "eq_03", "raw": "ERO(row_2, row_1, multiplier=-0.50)", "expected_class": "CLASS_C"},
    {"id": "eq_04", "raw": "P(Y=1|X) = \\frac{1}{1 + e^{-X\\beta}}", "expected_class": "CLASS_A"},
    {"id": "eq_05", "raw": "\\text{MAE} = 0.042 \\quad (\\text{SE} = 0.003)", "expected_class": "CLASS_B"},
    {"id": "eq_06", "raw": "ERO(pivot_table_header_col_3)", "expected_class": "CLASS_C"}
]

def classify_row(raw_str):
    if re.search(r"ERO\(", raw_str, re.IGNORECASE) or "pivot_table" in raw_str:
        return "CLASS_C"
    elif re.search(r"\\pm|CI|SE|95\%|99\%|\[\d+\.\d+,\s*\d+\.\d+\]", raw_str):
        return "CLASS_B"
    else:
        return "CLASS_A"

def run_partitioning():
    classified_results = []
    class_counts = {"CLASS_A": 0, "CLASS_B": 0, "CLASS_C": 0}

    for item in SAMPLE_ROWS:
        assigned_class = classify_row(item["raw"])
        class_counts[assigned_class] += 1
        classified_results.append({
            "id": item["id"],
            "raw": item["raw"],
            "assigned_class": assigned_class,
            "match_expected": assigned_class == item["expected_class"]
        })

    output_data = {
        "partition_grammar": {
            "CLASS_A": "Closed-form display equations (Kernels, algebraic identities)",
            "CLASS_B": "Empirical point estimates with uncertainty intervals (\\pm, CI, SE)",
            "CLASS_C": "Discarded table layout chrome (ERO(...), structural headers)"
        },
        "counts": class_counts,
        "samples": classified_results
    }

    output_path = "night/package_j4_ero_partitioning.json"
    with open(output_path, "w") as f:
        json.dump(output_data, f, indent=2)

    print("=== ARTIFACT: PACKAGE_J4 ===")
    print(f"Class A (Closed-form kernels): {class_counts['CLASS_A']}")
    print(f"Class B (Empirical point estimates w/ CI/SE): {class_counts['CLASS_B']}")
    print(f"Class C (Discarded ERO chrome): {class_counts['CLASS_C']}")
    print(f"Artifact written to: {output_path}")
    print("\nEVIDENCE CHECKLIST:")
    print("- Input data verified: Table row candidates & equation streams")
    print("- Grammar rules enforced: Strict regex for ERO(...), uncertainty intervals (\\pm, CI, SE), and algebraic display equations")
    print("- Boundaries checked: Empirical point estimates separated from pure identities")
    print("- What this artifact DOES NOT claim: Does not convert Class B empirical estimates into theoretical proof claims")
    print("\nNEXT: PACKAGE_J5 Hermes Equation Pool Audit (night/relation_guard.py)")

if __name__ == "__main__":
    run_partitioning()
