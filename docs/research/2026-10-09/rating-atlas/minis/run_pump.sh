#!/usr/bin/env bash
# L4 FLOW SNAPSHOT PUMP runner
# Usage: ./run_pump.sh [&] to background
# Output and errors go to pump.log
cd "$(dirname "$0")"
LOGFILE=pump.log
echo "=== Starting snapshot pump at $(date) ===" >> "$LOGFILE"
nohup python3 snapshot_pump.py >> "$LOGFILE" 2>&1 &
echo $! > pump.pid
echo "Started with PID $(cat pump.pid). Log: $LOGFILE"