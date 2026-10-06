#!/usr/bin/env python3
"""Run the qb-behavior test suite (stdlib unittest — no pytest dependency)."""
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "tests"))
sys.path.insert(0, os.path.join(HERE, "src"))

loader = unittest.TestLoader()
suite = unittest.TestSuite()
for mod in ("test_metrics", "test_units", "test_engine"):
    suite.addTests(loader.loadTestsFromName(mod))

runner = unittest.TextTestRunner(verbosity=2)
result = runner.run(suite)
sys.exit(0 if result.wasSuccessful() else 1)
