#!/usr/bin/env bash
# Roda a migração + testes de permissão num Postgres local descartável.
set -euo pipefail
cd "$(dirname "$0")/../.."
DB=criamercado_test
PSQL=(psql -v ON_ERROR_STOP=1 -q -X)
if [ "$(id -u)" = "0" ]; then PSQL=(runuser -u postgres -- "${PSQL[@]}"); fi
"${PSQL[@]}" -d postgres -c "drop database if exists $DB" -c "create database $DB"
"${PSQL[@]}" -d $DB -f supabase/tests/00_local_auth_shim.sql
for f in supabase/migrations/*.sql; do "${PSQL[@]}" -d $DB -f "$f"; done
for t in supabase/tests/[1-9]*.sql; do "${PSQL[@]}" -d $DB -f "$t"; done
echo "Testes do banco: todos passaram."
