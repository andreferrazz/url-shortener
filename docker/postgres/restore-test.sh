#!/bin/sh
# Proves the backups can be restored: restores the cluster's backup into this
# throwaway container, starts Postgres on it, and prints how many links it
# has. The running cluster is not touched.
#
# Usage: restore-test.sh                              restore to the end of the archived log
#        restore-test.sh "2026-01-31 14:05:00+00"     restore to that moment
set -eu

target=${1:-}
data=/tmp/restore
bin=/usr/lib/postgresql/19/bin
mkdir -m 700 "$data"

if [ -n "$target" ]; then
	set -- --type=time "--target=$target" --target-action=promote
else
	set --
fi

pgbackrest --stanza=url-shortener --pg1-path="$data" --log-level-console=warn "$@" restore

# The restored configuration is the cluster's own. Override what would tie it
# to the cluster, so this copy is a plain, isolated Postgres that only this
# container can reach.
"$bin/pg_ctl" --pgdata "$data" --wait --timeout 120 --silent --log /tmp/restore.log \
	--options "-c archive_mode=off -c listen_addresses='' -c unix_socket_directories=/tmp \
		-c hba_file=$data/pg_hba.conf -c ident_file=$data/pg_ident.conf \
		-c primary_conninfo='' -c synchronous_standby_names=''" \
	start || {
	cat /tmp/restore.log >&2
	exit 1
}

query() {
	psql --host /tmp --username postgres --dbname "${2:-postgres}" --no-align --tuples-only --command "$1"
}

until [ "$(query 'select pg_is_in_recovery()')" = f ]; do
	sleep 1
done

query "select 'links in the restore: ' || count(*) from links" local
query "select 'newest link created:  ' || coalesce(max(created_at)::text, 'none') from links" local

"$bin/pg_ctl" --pgdata "$data" --silent --mode immediate stop
