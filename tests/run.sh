#!/bin/bash
# usage: tests/run.sh e2e.py [more.py ...]  — serves dist/ on :8765 for the duration of the tests
cd "$(dirname "$0")/.."
python3 -m http.server 8765 --directory dist >/tmp/tm-srv.log 2>&1 & SRV=$!
trap "kill $SRV 2>/dev/null" EXIT
sleep 0.8
cd tests
for t in "$@"; do echo "== $t"; python3 "$t" 2>&1 | grep -v "agent-proxy\|connect_rejected\|Allowed domains\|For details\|and 1 more\|status of 500"; done
