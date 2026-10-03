#!/usr/bin/env bash
# Spin a DISPOSABLE local Postgres for integration tests (npm run test:integration:db).
# Ephemeral data dir under /tmp; trust auth; port 5433. Never use for real data.
#
# Usage:
#   npm run db:disposable           # init + start + create DB + push schema
#   export DATABASE_URL=postgresql://postgres@127.0.0.1:5433/sports_test?schema=public
#   export DIRECT_URL="$DATABASE_URL"
#   npm run test:integration:db
#
# CI note: if CI already provides a Postgres, skip this and just set DATABASE_URL
# before `npm run test:integration:db`.
set -euo pipefail

PORT=5433
DBNAME=sports_test
DATADIR=/tmp/pgdata
URL="postgresql://postgres@127.0.0.1:${PORT}/${DBNAME}?schema=public"

# Locate the Postgres server bins (Debian/Ubuntu install them outside PATH).
PGBIN=""
for d in /usr/lib/postgresql/*/bin "$(dirname "$(command -v pg_ctl 2>/dev/null || echo /nonexistent)")"; do
  [ -x "$d/initdb" ] && PGBIN="$d" && break
done
if [ -z "$PGBIN" ]; then
  echo "[disposable-pg] Postgres server binaries not found." >&2
  exit 1
fi

# Postgres refuses to run as root — use an unprivileged user when needed.
RUN_AS=""
if [ "$(id -u)" = "0" ]; then
  id pgtest >/dev/null 2>&1 || useradd -m pgtest
  RUN_AS="pgtest"
fi
run() { if [ -n "$RUN_AS" ]; then su "$RUN_AS" -c "$1"; else bash -c "$1"; fi; }

# Fresh data dir.
"$PGBIN/pg_ctl" -D "$DATADIR" stop >/dev/null 2>&1 || true
rm -rf "$DATADIR"; mkdir -p "$DATADIR"
[ -n "$RUN_AS" ] && chown -R "$RUN_AS":"$RUN_AS" "$DATADIR"

run "$PGBIN/initdb -D $DATADIR -U postgres --auth-local=trust --auth-host=trust" >/tmp/initdb.log 2>&1
run "$PGBIN/pg_ctl -D $DATADIR -o '-p $PORT -k /tmp' -l /tmp/pg.log -w start"
"$PGBIN/pg_isready" -p "$PORT" -h 127.0.0.1
"$PGBIN/createdb" -p "$PORT" -h 127.0.0.1 -U postgres "$DBNAME"

echo "[disposable-pg] pushing Prisma schema..."
DATABASE_URL="$URL" DIRECT_URL="$URL" npm run db:push --workspace=packages/db

echo ""
echo "[disposable-pg] ready. Export these, then run the integration smoke:"
echo "  export DATABASE_URL='$URL'"
echo "  export DIRECT_URL='$URL'"
echo "  npm run test:integration:db"
