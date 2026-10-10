#!/usr/bin/env bash
# L4 FLOW PUMP — CADENCE AUTOMATION
# Runs snapshot_pump.py every 30 min during game windows:
#   Sat 11:00-23:00 CT, Sun 11:00-23:00 CT
# Outside windows: sleeps until next window.
# Logs every run to pump_cadence.log with timestamp, rows, errors.
# Pump failures: retry 3x with 60s backoff, then skip to next slot.
#
# Usage:
#   ./pump_cadence.sh          # foreground (for testing)
#   nohup ./pump_cadence.sh > pump_cadence.out 2>&1 &   # background
#
# Environment:
#   PUMP_WAREHOUSE_DIR  warehouse dir (default: ./warehouse)
#   CFBD_API_KEY        optional; CFBD source skipped gracefully if unset

set -u
cd "$(dirname "$0")"

export PUMP_WAREHOUSE_DIR="${PUMP_WAREHOUSE_DIR:-$PWD/warehouse}"
mkdir -p "$PUMP_WAREHOUSE_DIR"

LOGFILE="$PWD/pump_cadence.log"
PIDFILE="$PWD/pump_cadence.pid"
INTERVAL=1800   # 30 minutes in seconds

echo $$ > "$PIDFILE"
log() { echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*" >> "$LOGFILE"; }

log "=== pump_cadence started (PID $$) ==="
log "warehouse_dir=$PUMP_WAREHOUSE_DIR interval=${INTERVAL}s"

# in_window: 1 if now is Sat/Sun 11:00-23:00 America/Chicago, else 0
in_window() {
    local dow hour
    dow=$(TZ=America/Chicago date +%u)   # 1=Mon .. 7=Sun
    hour=$(TZ=America/Chicago date +%H)   # 00-23
    if { [ "$dow" = "6" ] || [ "$dow" = "7" ]; } && [ "$hour" -ge 11 ] && [ "$hour" -lt 23 ]; then
        return 0
    fi
    return 1
}

# seconds until next window opens (Sat or Sun 11:00 CT)
secs_to_window() {
    python3 - "$@" <<'PY'
import datetime, sys
ct = datetime.timezone(datetime.timedelta(hours=-5))  # CDT (Oct); CST handled by checking both
now = datetime.datetime.now(ct)
# find next Sat(5) or Sun(6) 11:00
for delta in range(0, 8):
    d = now + datetime.timedelta(days=delta)
    if d.weekday() in (5, 6):  # 5=Sat, 6=Sun
        target = d.replace(hour=11, minute=0, second=0, microsecond=0)
        if target > now:
            print(int((target - now).total_seconds()))
            sys.exit(0)
print(3600)
PY
}

run_pump() {
    local attempt=1 max_attempts=3 out rows
    while [ $attempt -le $max_attempts ]; do
        out=$(python3 snapshot_pump.py 2>&1)
        local rc=$?
        rows=$(echo "$out" | grep -oP 'Total:\K[0-9]+' | tail -1)
        rows="${rows:-0}"
        if [ $rc -eq 0 ]; then
            log "run ok attempt=$attempt rows=$rows"
            echo "$out" | tail -5 | while IFS= read -r l; do log "  | $l"; done
            return 0
        fi
        log "run FAILED attempt=$attempt rc=$rc rows=$rows"
        echo "$out" | tail -10 | while IFS= read -r l; do log "  ! $l"; done
        attempt=$((attempt + 1))
        [ $attempt -le $max_attempts ] && sleep 60
    done
    log "run SKIPPED after $max_attempts attempts"
    return 1
}

# --- main loop ---
while true; do
    if in_window; then
        log "--- slot start (in game window) ---"
        run_pump || true
        log "--- slot end; sleeping ${INTERVAL}s ---"
        sleep $INTERVAL
    else
        wait_s=$(secs_to_window)
        # cap single sleep at 1h so Ctrl-C / deploys stay responsive-ish
        [ "$wait_s" -gt 3600 ] && wait_s=3600
        log "outside game window; sleeping ${wait_s}s"
        sleep "$wait_s"
    fi
done
