#!/bin/bash
# Rebuilds a scratch database from the migrations and runs the SQL tests. Needs a local Postgres (PGHOST/PGPORT).
set -e
cd "$(dirname "$0")/.."
export PGUSER=${PGUSER:-postgres} PGHOST=${PGHOST:-/var/tmp/tmpg} PGPORT=${PGPORT:-54329}
psql -qX -d postgres -c "drop database if exists twominds_test" -c "create database twominds_test"
psql -qX -v ON_ERROR_STOP=1 -d twominds_test -f tests/stubs.sql
for f in migrations/*.sql; do psql -qX -v ON_ERROR_STOP=1 -d twominds_test -f "$f" || { echo "FAILED in $f"; exit 1; }; done
echo "migrations applied"
psql -qX -v ON_ERROR_STOP=1 -d twominds_test -f seed.sql
python3 tests/test_game.py
python3 tests/test_import.py
