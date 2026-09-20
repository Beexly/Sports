#!/bin/bash
# Setup script for Galaxy Sports Edge (GSE) system fixes
# This script installs required dependencies and prepares the environment

set -e

echo "=== Galaxy Sports Edge (GSE) System Fixes Installation ==="

# Install Python packages if needed
pip install numpy pandas psutil

# Ensure required modules are available
echo "Required modules: numpy, pandas, psutil"

# Verify installation
python3 -c "import numpy; import pandas; import psutil; print('All dependencies OK')"

echo "Setup completed successfully!"
