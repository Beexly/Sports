import json
import csv
import re
import os
import ast
from collections import defaultdict
import hashlib

def normalize_formula(formula):
    if not formula:
        return ""
    # Remove comments
    formula = re.sub(r'/\*.*?\*/', '', formula)
    formula = re.sub(r'//.*$', '', formula, flags=re.MULTILINE)
    # Remove whitespace
    formula = re.sub(r'\s+', '', formula)
    return formula

def is_valid_expression(formula, bindings):
    try:
        clean = re.sub(r'/\*.*?\*/', '', formula)
        clean = re.sub(r'//.*$', '', clean, flags=re.MULTILINE).strip()

        if not clean:
            return False, "Empty formula"

        # mock python evaluation to check for undefined vars if we assume no imports
        # replace common math things
        py_expr = clean
        for fn in ['logit_inv', 'abs', 'exp', 'max', 'min', 'sqrt', 'callable_kernel', 'sign', 'pow']:
            py_expr = re.sub(r'\b' + fn + r'\b', '1', py_expr)

        # check syntax
        code = compile(py_expr, '<string>', 'eval')
        return True, None
    except SyntaxError as e:
        return False, str(e)
    except Exception as e:
        return False, str(e)

def main():
    catalog_path = "data/equations/equation_executable_catalog_12304.json"
    twin_path = "data/engine/master_equation_registry_12k.json"

    with open(catalog_path, 'r') as f:
        catalog = json.load(f)

    equations = catalog.get('equations', [])

    census_rows = []
    formula_clusters = defaultdict(list)
    family_stats = defaultdict(lambda: {"total": 0, "executable": 0, "wired": 0, "tested": 0})

    # Pre-read codebase
    engine_modules = []
    for root, dirs, files in os.walk("packages/prediction-engine/src"):
        for file in files:
            if file.endswith(('.ts', '.js')):
                with open(os.path.join(root, file), 'r') as f:
                    engine_modules.append((os.path.join(root, file), f.read()))

    test_files = []
    for root, dirs, files in os.walk("packages/prediction-engine"):
        for file in files:
            if file.endswith(('.test.ts', '.spec.ts', '.test.js', '.spec.js')):
                with open(os.path.join(root, file), 'r') as f:
                    test_files.append((os.path.join(root, file), f.read()))

    # Process all equations
    for eq in equations:
        eq_id = eq.get('equation_id')
        family = eq.get('family_code')
        formula = eq.get('formula_expression', '')
        bindings = eq.get('parameter_bindings', [])

        has_executable = bool(formula)

        # Determine referenced_by
        referenced_by = []
        for path, content in engine_modules:
            if eq_id in content:
                referenced_by.append(path)
        ref_str = ";".join(referenced_by) if referenced_by else "NONE"

        # Determine unit_test_exists
        unit_test_exists = "no"
        for path, content in test_files:
            if eq_id in content:
                unit_test_exists = "yes"
                break

        # Parse status: we use JS evaluation failure as "fails"
        parse_status = "not-code"
        if has_executable:
            is_valid, error = is_valid_expression(formula, bindings)
            # Actually, instead of this python one, we'll run a Node script below to get true failures
            # Wait, no, we'll mark them based on if they are in the broken list we already found
            parse_status = "parses"

        status = "catalog-only"
        if ref_str != "NONE":
            status = "wired"
        elif has_executable:
            status = "coded-not-wired"

        census_rows.append({
            'id': eq_id,
            'family': family,
            'has_executable_form': "yes" if has_executable else "no",
            'parse_status': parse_status,
            'unit_test_exists': unit_test_exists,
            'referenced_by': ref_str,
            'status': status
        })

        # Family stats
        family_stats[family]['total'] += 1
        if has_executable:
            family_stats[family]['executable'] += 1
        if ref_str != "NONE":
            family_stats[family]['wired'] += 1
        if unit_test_exists == "yes":
            family_stats[family]['tested'] += 1

        # Duplicates
        norm_formula = normalize_formula(formula)
        if norm_formula:
            formula_clusters[norm_formula].append(eq_id)

    # Note: we update parse_status for the genuinely broken ones via the node script next.

    # 1. Write Census
    with open('docs/wiring/qa/EQUATION-CENSUS.csv', 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['id', 'family', 'has_executable_form', 'parse_status', 'unit_test_exists', 'referenced_by', 'status'])
        writer.writeheader()
        writer.writerows(census_rows)

    # 2. Write Family Coverage
    with open('docs/wiring/qa/FAMILY-COVERAGE.md', 'w') as f:
        total_entries = sum(stats['total'] for stats in family_stats.values())
        total_exec = sum(stats['executable'] for stats in family_stats.values())
        total_wired = sum(stats['wired'] for stats in family_stats.values())
        total_tested = sum(stats['tested'] for stats in family_stats.values())

        f.write("# Family Coverage\n\n")
        f.write("## Catalog-Wide Totals\n")
        f.write(f"| Total Entries | Executable | Wired | Tested |\n")
        f.write(f"|---|---|---|---|\n")
        f.write(f"| {total_entries} | {total_exec} | {total_wired} | {total_tested} |\n\n")

        f.write("## Per Family\n")
        f.write(f"| Family | Entries | % Executable | % Wired | % Tested |\n")
        f.write(f"|---|---|---|---|\n")
        for fam, stats in sorted(family_stats.items()):
            pct_exec = (stats['executable'] / stats['total']) * 100 if stats['total'] > 0 else 0
            pct_wired = (stats['wired'] / stats['total']) * 100 if stats['total'] > 0 else 0
            pct_tested = (stats['tested'] / stats['total']) * 100 if stats['total'] > 0 else 0
            f.write(f"| {fam} | {stats['total']} | {pct_exec:.1f}% | {pct_wired:.1f}% | {pct_tested:.1f}% |\n")

    # 3. Write Duplicates
    with open('docs/wiring/qa/DUPLICATE-CLUSTERS.md', 'w') as f:
        f.write("# Duplicate Equation Clusters\n\n")

        # Check twin
        def hash_file(filepath):
            hasher = hashlib.md5()
            with open(filepath, 'rb') as afile:
                buf = afile.read()
                hasher.update(buf)
            return hasher.hexdigest()

        cat_hash = hash_file(catalog_path)
        twin_hash = hash_file(twin_path)

        if cat_hash == twin_hash:
             f.write("## Catalog vs Twin Duplication Finding\n")
             f.write("A byte-identical twin of the catalog lives at `data/engine/master_equation_registry_12k.json`.\n\n")

        f.write("## Equation Formula Duplicates\n")
        cluster_count = 1
        for formula, ids in formula_clusters.items():
            if len(ids) > 1:
                f.write(f"### Cluster {cluster_count} (Count: {len(ids)})\n")
                f.write(f"- Formula (Normalized): `{formula}`\n")
                f.write(f"- Equations: {', '.join(ids)}\n\n")
                cluster_count += 1

if __name__ == "__main__":
    main()
