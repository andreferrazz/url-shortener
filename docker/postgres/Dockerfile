# Postgres managed by Patroni, which elects a leader among the nodes and
# promotes a standby when the leader is lost.
FROM postgres:19

RUN apt-get update \
	&& apt-get install -y --no-install-recommends patroni python3-etcd \
	&& rm -rf /var/lib/apt/lists/*

COPY patroni.yml /etc/patroni/patroni.yml
COPY --chmod=755 post-bootstrap.sh /usr/local/bin/post-bootstrap.sh

# Patroni initialises and starts Postgres itself, so the image's own
# entrypoint (which would run initdb) is not used.
USER postgres
ENTRYPOINT ["patroni", "/etc/patroni/patroni.yml"]
