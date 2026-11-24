#!/bin/sh
# Run by Patroni once, on the first leader, right after the cluster is
# created. Creates the application's role and database.
set -eu

psql --dbname "$1" --set ON_ERROR_STOP=1 \
	--set app_user="$APP_DB_USER" --set app_password="$APP_DB_PASSWORD" --set app_db="$APP_DB_NAME" <<'SQL'
create role :"app_user" login password :'app_password';
create database :"app_db" owner :"app_user";
SQL

# Prepare the backup repository in the bucket. Until this exists, archiving
# the write-ahead log fails and Postgres keeps the segments locally.
pgbackrest --stanza=url-shortener stanza-create
