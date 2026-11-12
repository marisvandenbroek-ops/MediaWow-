#!/usr/bin/env bash
# Draait schema.sql (twee keer, om te controleren dat het opnieuw uitvoerbaar is) en de databasetests
# op een lege, tijdelijke database. Vereist een lokale PostgreSQL (psql) en rechten om databases te maken.
#
#   PGHOST=... PGPORT=... PGUSER=postgres tests/db/run.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
DB="rooster_test_$$"
psql -q -v ON_ERROR_STOP=1 -d postgres -c "create database $DB" >/dev/null
trap 'psql -q -d postgres -c "drop database if exists $DB" >/dev/null' EXIT
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f tests/db/setup-mock-supabase.sql >/dev/null
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f supabase/schema.sql >/dev/null 2>&1 || { psql -v ON_ERROR_STOP=1 -d "$DB" -f supabase/schema.sql; exit 1; }
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f supabase/schema.sql >/dev/null 2>&1 || { echo "schema.sql is niet opnieuw uitvoerbaar"; exit 1; }
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f tests/db/test.sql 2>&1 | sed -e 's/^psql:[^ ]* NOTICE:  /  /' -e 's/^NOTICE:  /  /'
