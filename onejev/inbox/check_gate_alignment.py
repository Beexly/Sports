"""Fail loudly if an enforcing script and the writer disagree on the gate.

THE 357-ROW INCIDENT
enforce_audit_pass.py imported eq_recover.recover while build_drain.py had moved
to eq_recover_ineq.recover. The enforcer then judged rows the writer had just
accepted, by an OLDER rule, and deleted 357 rows of real mathematics. Nothing
errored -- it simply did its job using the wrong authority.

THE FIX THAT MAKES THE CLASS IMPOSSIBLE
An enforcer must import the SAME recover the writer imports. Assert it. The gate
is read from the writer's own module reference rather than hardcoded twice, so
the two cannot drift apart again.

    python check_gate_alignment.py build_drain.py enforce_audit_pass.py
    python check_gate_alignment.py corpus_gate.py audit_drain.py

Exit 0 = both resolve recover to the same module. Exit 1 = the enforcer is stale.
"""
import importlib
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent


def gate_module(path):
    """Import a local script by filename and report which module its `recover` is."""
    p = HERE / path
    if not p.exists():
        return None, "missing"
    sys.path.insert(0, str(HERE))
    try:
        mod = importlib.import_module(p.stem)
    except Exception as e:                      # noqa: BLE001
        return None, f"import error: {type(e).__name__}: {e}"
    fn = getattr(mod, "recover", None)
    if fn is not None:
        # For a re-exported function the defining module is in __module__; for a
        # wrapper it is the wrapper itself. Either way it identifies the authority.
        return getattr(fn, "__module__", mod.__name__), "ok"

    # A writer may expose only write_drain (build_drain does). Its recover is the
    # one write_drain closes over, which is exactly the authority in question.
    wd = getattr(mod, "write_drain", None)
    if wd is None:
        return None, "no recover or write_drain"
    src = Path(getattr(mod, "__file__", ""))
    try:
        text = src.read_text(encoding="utf-8", errors="replace")
    except Exception:                          # noqa: BLE001
        return None, "cannot read source"
    names = re.findall(r"^from\s+(\w+)\s+import\s+(.*)$", text, re.M)
    hits = []
    for mod_name, imported in names:
        for sym in [s.strip() for s in imported.split(",")]:
            if sym in ("recover", "write_drain", "drain_row"):
                hits.append(f"{mod_name}.{sym}")
    return (hits[0] if hits else None), ("ok" if hits else "no gate import found")


def owner(value):
    """Reduce a 'mod.symbol' string to just the MODULE that defines the gate.

    build_drain reaches the gate through eq_recover_ineq.write_drain while
    enforce_audit_pass imports eq_recover_ineq.recover directly. Same authority,
    different path -- so compare modules, not symbol names.
    """
    return value.split(".")[0] if value else None


def main(writer, enforcer):
    w, ws = gate_module(writer)
    e, es = gate_module(enforcer)
    print(f"writer   {writer:<24} gate={w}   ({ws})")
    print(f"enforcer {enforcer:<24} gate={e}   ({es})")
    if ws != "ok" or es != "ok":
        print("RESULT: cannot compare -- resolve the import error first")
        return 1
    if owner(w) == owner(e):
        print(f"RESULT: ALIGNED on {owner(w)} -- the enforcer judges rows by the writer's rule")
        return 0
    print(f"RESULT: MISMATCH. Enforcer uses {e} but writer uses {w}.")
    print("        It will delete rows the writer just accepted, silently.")
    return 1


if __name__ == "__main__":
    args = sys.argv[1:]
    if len(args) != 2:
        print(__doc__)
        raise SystemExit(2)
    raise SystemExit(main(args[0], args[1]))