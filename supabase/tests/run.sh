#!/usr/bin/env bash
# Verifies the migrations + RLS on a throwaway local PostgreSQL database.
# Usage: supabase/tests/run.sh   (needs psql access, e.g. run as the postgres user)
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)"
DB="one_migration_test_$$"
createdb "$DB"
trap 'dropdb --if-exists "$DB"; psql -q -c "drop role if exists anon; drop role if exists authenticated; drop role if exists service_role;" postgres >/dev/null 2>&1 || true' EXIT
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/tests/supabase-stub.sql"
for f in "$DIR"/migrations/*.sql; do psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f"; done
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/tests/rls.test.sql"
