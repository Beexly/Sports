"""
PROJECT MOVE-37 — import-and-construct dry-run gate (audit fix list item E.1).

Purpose: before any theorist-delivered script is called "ready to run cold,"
catch two classes of defect for free, in under a second, with zero data:

  1. Syntax errors (ast.compile).
  2. Invalid constructor calls to sklearn estimators — the exact defect class
     that let `GradientBoostingRegressor(max_iter=150, ...)` ship unnoticed
     across move37_irl_prelec.py and at least three chained repair rounds of
     the same script family (see move37-audit-corrections-ledger.md item 9).
     `max_iter` is a valid constructor kwarg for HistGradientBoostingRegressor
     but not for GradientBoostingRegressor (which uses `n_estimators`); this
     only raises at call time, so a plain `ast.compile()` pass (valid syntax)
     is not enough — the constructor actually has to be called.

This is intentionally narrow: it does NOT run the script, fetch data, or fit
a model. It parses the AST, finds every call to a name that resolves (via the
file's own `from sklearn.X import Y` statements) to a scikit-learn class, and
re-executes JUST that constructor call with the literal keyword arguments
found in the source, in isolation. A TypeError on construction is caught and
reported; anything else propagates (a probe that swallows every exception is
not a probe).

Usage: python import_construct_probe.py <file.py> [<file.py> ...]
Exit code: 0 if every probed file's syntax and constructor calls are clean,
1 if any file has a syntax error or a constructor-call defect.
"""

import ast
import importlib
import inspect
import sys


def check_syntax(path, source):
    try:
        compile(source, path, "exec")
        return True, None
    except SyntaxError as e:
        return False, f"SyntaxError: {e}"


def find_sklearn_imports(tree):
    """Map local name -> (module, class_name) for every `from sklearn... import X` in the file."""
    mapping = {}
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom) and node.module and node.module.startswith("sklearn"):
            for alias in node.names:
                local_name = alias.asname or alias.name
                mapping[local_name] = (node.module, alias.name)
    return mapping


def _is_safe_literal(node):
    """True if this AST node is a constant, or a list/tuple/dict of constants —
    i.e. safe to evaluate with no surrounding script state. Anything referencing
    a variable (a local computed at runtime, like fitted data) is NOT safe and
    must be skipped rather than guessed at."""
    if isinstance(node, ast.Constant):
        return True
    if isinstance(node, (ast.List, ast.Tuple)):
        return all(_is_safe_literal(e) for e in node.elts)
    if isinstance(node, ast.Dict):
        return all(_is_safe_literal(k) for k in node.keys if k is not None) and all(
            _is_safe_literal(v) for v in node.values
        )
    return False


def probe_constructor_calls(path, tree, sklearn_names):
    """Find every Call to an imported sklearn CLASS (not a function like
    log_loss) whose arguments are all literals — i.e. a hyperparameter-only
    constructor call, exactly the "ready to run cold" case this probe exists
    for. Calls that reference runtime variables (fitted arrays, data splits)
    are skipped, not guessed at: this probe reports only what it can safely
    re-evaluate in isolation, never a false failure from missing scope."""
    results = []
    skipped = []
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue
        func = node.func
        name = func.id if isinstance(func, ast.Name) else None
        if name not in sklearn_names:
            continue
        module, cls_name = sklearn_names[name]
        call_src = ast.unparse(node)

        try:
            mod = importlib.import_module(module)
            obj = getattr(mod, cls_name)
        except Exception as e:  # noqa: BLE001
            results.append((False, call_src, f"could not import {module}.{cls_name}: {e}"))
            continue

        if not inspect.isclass(obj):
            skipped.append((call_src, "not a class (e.g. a metrics function like log_loss)"))
            continue

        all_args_literal = all(_is_safe_literal(a) for a in node.args) and all(
            _is_safe_literal(kw.value) for kw in node.keywords
        )
        if not all_args_literal:
            skipped.append((call_src, "arguments reference runtime state, not probed"))
            continue

        try:
            local_ns = {name: obj}
            eval(compile(ast.Expression(body=node), "<probe>", "eval"), {}, local_ns)
            results.append((True, call_src, None))
        except Exception as e:  # noqa: BLE001 — we want to see and report every kind
            results.append((False, call_src, f"{type(e).__name__}: {e}"))
    return results, skipped


def probe_file(path):
    with open(path) as f:
        source = f.read()

    ok_syntax, syntax_err = check_syntax(path, source)
    print(f"\n=== {path} ===")
    if not ok_syntax:
        print(f"  [FAIL] {syntax_err}")
        return False

    print("  [OK] syntax")

    tree = ast.parse(source, filename=path)
    sklearn_names = find_sklearn_imports(tree)
    if not sklearn_names:
        print("  [OK] no sklearn constructor calls to probe")
        return True

    results, skipped = probe_constructor_calls(path, tree, sklearn_names)
    for call_src, reason in skipped:
        print(f"  [SKIP] {call_src}  ({reason})")

    if not results:
        print(f"  [OK] no literal-argument sklearn constructor calls to probe")
        return True

    file_ok = True
    for ok, call_src, err in results:
        if ok:
            print(f"  [OK]   {call_src}")
        else:
            file_ok = False
            print(f"  [FAIL] {call_src}")
            print(f"         {err}")
    return file_ok


def main(argv):
    if not argv:
        print("usage: python import_construct_probe.py <file.py> [<file.py> ...]")
        return 2
    all_ok = True
    for path in argv:
        if not probe_file(path):
            all_ok = False
    print()
    print("RESULT:", "ALL CLEAN" if all_ok else "DEFECTS FOUND")
    return 0 if all_ok else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
