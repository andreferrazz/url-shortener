#!/bin/sh
# Takes a backup if this node is the leader; exits 3 if it is a standby.
# Usage: backup-if-leader.sh [full|diff|incr]
set -eu

if [ "$(psql --username postgres --no-align --tuples-only --command 'select pg_is_in_recovery()')" != f ]; then
	exit 3
fi

exec pgbackrest --stanza=url-shortener --type="${1:-incr}" backup
