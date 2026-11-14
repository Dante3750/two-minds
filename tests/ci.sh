#!/bin/bash
# Runs the faster test files and fails if any check fails. Used by the GitHub workflow; works locally too.
cd "$(dirname "$0")/.."
python3 build.py || exit 1
out=$(tests/run.sh regress.py fixes.py back.py extras.py 2>&1); echo "$out"
if echo "$out" | grep -qE "^FAIL |Traceback|^ERRORS: \[|^FAILED: \["; then
  echo "::error title=Game tests failed::$(echo "$out" | grep -E "^FAIL |Error|^ERRORS: \[" | head -20 | sed 's/%/%25/g' | awk '{printf "%s%%0A", $0}')"
  exit 1
fi
[ "$(echo "$out" | grep -c '^PASS ')" -ge 15 ] || { echo "::error title=Game tests failed::too few checks ran"; exit 1; }
