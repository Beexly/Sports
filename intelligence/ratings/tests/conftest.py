# Ensures the build root is importable when this test dir is collected
# directly (the master runner already puts it on sys.path).
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
