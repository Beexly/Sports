#!/usr/bin/env bash
# ==========================================================================
# run-cutoff-matrix.sh -- REAL TLC cutoff/family evidence pack.
#
# For n in 1..8: generate a cfg with CONSTANTS InvIds = {i1,..,in}, run TLC
# on formal/abstract/AtMostOneFamily.tla checking TypeOK /\ AtMostOne under
# the CONTROLLED next-state relation, and require "No error" for each n.
# Receipts land under formal/receipts/cutoff-matrix/ (n1..n8.txt + summary.txt).
#
# The script FAILS (nonzero exit) if any n that runs does NOT verify. It
# records the ACTUAL largest n that verified as N_STAR. It never claims an n
# that did not finish -- N_STAR is the real largest verified cardinality.
#
# JAR path: /tmp/tla2tools.jar (this repo ships no formal/tools/tla2tools.jar).
# ==========================================================================
set -u

# Resolve repo root from this script's location (scripts/formal/ -> repo root).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${REPO_ROOT}" || exit 2

JAR="${TLA_TOOLS_JAR:-/tmp/tla2tools.jar}"
MODULE="formal/abstract/AtMostOneFamily.tla"
OUTDIR="formal/receipts/cutoff-matrix"
CFGDIR="$(mktemp -d)"
SUMMARY="${OUTDIR}/summary.txt"

MAX_N="${MAX_N:-8}"

if [[ ! -f "${JAR}" ]]; then
  echo "FATAL: TLA+ tools jar not found at ${JAR}" >&2
  exit 2
fi
if [[ ! -f "${MODULE}" ]]; then
  echo "FATAL: module not found at ${MODULE}" >&2
  exit 2
fi

mkdir -p "${OUTDIR}"
: > "${SUMMARY}"
{
  echo "cutoff-matrix summary -- SpecC => [](TypeOK /\\ AtMostOne)"
  echo "module : ${MODULE}"
  echo "jar    : ${JAR}"
  echo "date   : $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "sha    : $(git rev-parse HEAD 2>/dev/null || echo unknown)"
  echo "=========================================================="
} >> "${SUMMARY}"

N_STAR=0
FAILED=0

for (( n=1; n<=MAX_N; n++ )); do
  # Build the invocation-id set {i1, .., in}.
  ids=""
  for (( k=1; k<=n; k++ )); do
    if [[ -z "${ids}" ]]; then ids="i${k}"; else ids="${ids}, i${k}"; fi
  done

  cfg="${CFGDIR}/n${n}.cfg"
  cat > "${cfg}" <<EOF
\* Cutoff family member n=${n}: AtMostOne must HOLD (controlled system).
CONSTANTS InvIds = {${ids}}
INIT Init
NEXT NextControlled
INVARIANT TypeOK
INVARIANT AtMostOne
EOF

  receipt="${OUTDIR}/n${n}.txt"
  echo ">>> n=${n} : InvIds = {${ids}}"
  java -jar "${JAR}" -config "${cfg}" "${MODULE}" -workers auto -deadlock \
    2>&1 | tee "${receipt}"

  # Pull state counts from the receipt for the summary.
  counts="$(grep -Eo '[0-9]+ states generated, [0-9]+ distinct states found' "${receipt}" | tail -1)"

  {
    echo "=== n=${n} ==="
    echo "InvIds = {${ids}}"
    echo "${counts:-<no state-count line found>}"
  } >> "${SUMMARY}"

  if grep -q "No error has been found" "${receipt}"; then
    echo "    n=${n}: VERIFIED (No error has been found)"
    echo "result : VERIFIED (No error has been found)" >> "${SUMMARY}"
    N_STAR="${n}"
  else
    echo "    n=${n}: NOT VERIFIED (no 'No error' line) -- stopping." >&2
    echo "result : NOT VERIFIED -- see ${receipt}" >> "${SUMMARY}"
    FAILED=1
    break
  fi
done

{
  echo "=========================================================="
  echo "N_STAR=${N_STAR}"
  if [[ "${FAILED}" -eq 0 && "${N_STAR}" -ge 1 ]]; then
    echo "CUTOFF_MATRIX_OK"
  else
    echo "CUTOFF_MATRIX_INCOMPLETE"
  fi
} >> "${SUMMARY}"

rm -rf "${CFGDIR}"

echo "-----------------------------------------------------------"
echo "N_STAR=${N_STAR}"
if [[ "${FAILED}" -ne 0 ]]; then
  echo "CUTOFF_MATRIX_INCOMPLETE -- a family member did not verify." >&2
  exit 1
fi
echo "CUTOFF_MATRIX_OK"
exit 0
