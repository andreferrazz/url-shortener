#!/bin/sh
# Takes a backup of the local database cluster, on whichever node is leader.
# Usage: pnpm db:backup [full|diff|incr]   (default: incr; the first is always full)
set -eu

for node in pg1 pg2 pg3; do
	status=0
	docker compose exec -T "$node" backup-if-leader.sh "${1:-incr}" </dev/null || status=$?
	case $status in
		0) exec docker compose exec -T "$node" pgbackrest --stanza=url-shortener info </dev/null ;;
		3) ;; # a standby, or a node that is down: try the next one
		*) [ $status -eq 1 ] && continue; exit $status ;;
	esac
done

echo "No leader found. Check 'pnpm db:status'." >&2
exit 1
