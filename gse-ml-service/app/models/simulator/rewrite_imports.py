import os
import glob

def replace_in_file(filepath, old, new):
    with open(filepath, 'r') as f:
        content = f.read()
    content = content.replace(old, new)
    with open(filepath, 'w') as f:
        f.write(content)

for filepath in glob.glob("gse-ml-service/app/models/simulator/*.py"):
    replace_in_file(filepath, "from .kats_consts import TimeSeriesData", "from .kats_consts import TimeSeriesData")
    replace_in_file(filepath, "from .kats_compat_compat import compat", "from .kats_compat_compat import compat")
    replace_in_file(filepath, "from .kats_compat_pandas import assert_frame_equal, assert_series_equal", "from .kats_compat_pandas import assert_frame_equal, assert_series_equal")
