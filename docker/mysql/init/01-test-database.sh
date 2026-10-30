#!/bin/sh
set -e

# Functional tests run against a separate database (see config/packages/doctrine.yaml).
mysql --user=root --password="$MYSQL_ROOT_PASSWORD" <<-SQL
	CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}_test\`;
	GRANT ALL PRIVILEGES ON \`${MYSQL_DATABASE}_test\`.* TO '${MYSQL_USER}'@'%';
SQL
