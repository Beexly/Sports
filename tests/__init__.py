# Makes the tests package importable as `tests.*` under pytest's
# default (prepend) import mode, so `from tests.verify_out_of_sample_calibration
# import ...` style imports resolve deterministically in CI (where the
# ModuleNotFoundError collected ERRORs on two modules).
