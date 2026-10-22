import sys
import importlib

packages = ["pandas", "numpy", "nfl_data_py", "scipy", "statsmodels", "requests"]
results = {}
for pkg in packages:
    try:
        mod = importlib.import_module(pkg)
        ver = getattr(mod, "__version__", "unknown")
        results[pkg] = f"OK ({ver})"
    except ImportError as e:
        results[pkg] = f"MISSING"

with open("C:/Users/Garrett/AppData/Local/hermes_nfl_cache/pkg_check.txt", "w") as f:
    for pkg, status in results.items():
        f.write(f"{pkg}: {status}\n")
    f.write(f"Python: {sys.version}\n")
    f.write("DONE\n")
