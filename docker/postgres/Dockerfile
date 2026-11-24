# Postgres managed by Patroni, which elects a leader among the nodes and
# promotes a standby when the leader is lost. pgBackRest ships the
# write-ahead log and base backups to a bucket.
FROM postgres:19

RUN apt-get update \
	&& apt-get install -y --no-install-recommends patroni python3-etcd pgbackrest \
	&& rm -rf /var/lib/apt/lists/*

COPY patroni.yml /etc/patroni/patroni.yml
COPY pgbackrest.conf /etc/pgbackrest/pgbackrest.conf
COPY --chmod=755 post-bootstrap.sh backup-if-leader.sh restore-test.sh /usr/local/bin/

# Patroni initialises and starts Postgres itself, so the image's own
# entrypoint (which would run initdb) is not used.
USER postgres
ENTRYPOINT ["patroni", "/etc/patroni/patroni.yml"]
