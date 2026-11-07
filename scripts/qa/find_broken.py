import json
import re

def clean_formula(formula):
    # Remove C-style block comments
    formula = re.sub(r'/\*.*?\*/', '', formula)
    # Remove C-style inline comments
    formula = re.sub(r'//.*$', '', formula)
    return formula.strip()

def tokenize(expr):
    # Quick and dirty tokenizer for math expressions
    tokens = re.findall(r'[a-zA-Z_]\w*|[0-9.]+|[-+*/()]', expr)
    return tokens

def is_valid_expression(expr):
    try:
        # We can evaluate this with some mock variables
        tokens = tokenize(expr)
        vars = set(t for t in tokens if re.match(r'[a-zA-Z_]\w*', t) and t not in ['logit_inv', 'exp', 'log', 'max', 'min', 'sin', 'cos', 'tan'])

        # Replace functions
        py_expr = expr.replace('logit_inv', '1') # mock functions

        # We can use python's compile to check if it's valid syntax
        # But we need to make sure undefined symbols don't cause syntax errors
        # Actually compile just checks syntax, not undefined vars
        compile(py_expr, '<string>', 'eval')
        return True, None
    except SyntaxError as e:
        return False, str(e)
    except Exception as e:
        return False, str(e)

def main():
    catalog_path = "data/equations/equation_executable_catalog_12304.json"
    with open(catalog_path, 'r') as f:
        catalog = json.load(f)

    equations = catalog.get('equations', [])
    broken = []

    for eq in equations:
        eq_id = eq.get('equation_id')
        raw_formula = eq.get('formula_expression', '')
        if not raw_formula:
            continue

        formula = clean_formula(raw_formula)

        is_valid, error = is_valid_expression(formula)
        if not is_valid:
            broken.append({
                'id': eq_id,
                'error': error,
                'formula': raw_formula,
                'cleaned': formula,
                'bindings': eq.get('parameter_bindings', [])
            })

    print(f"Found {len(broken)} broken equations based on simple syntax check.")
    for b in broken[:10]:
        print(f"{b['id']}: {b['error']} | {b['cleaned']}")

    with open('docs/wiring/qa/BROKEN-EQUATIONS.md', 'w') as f:
        f.write("# Broken Equations\n\n")
        for b in broken:
            f.write(f"## {b['id']}\n")
            f.write(f"- Error: {b['error']}\n")
            f.write(f"- Formula: `{b['formula']}`\n")
            f.write(f"- Cleaned: `{b['cleaned']}`\n")
            f.write(f"- Expected Bindings: {', '.join(b['bindings'])}\n\n")

if __name__ == "__main__":
    main()
