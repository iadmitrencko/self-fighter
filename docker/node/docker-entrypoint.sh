#!/bin/sh
set -e

# Install dependencies only when the lock file has changed.
stamp=node_modules/.package-lock.sha256
checksum=$(sha256sum package-lock.json | cut -d ' ' -f 1)

if [ ! -f "$stamp" ] || [ "$(cat "$stamp")" != "$checksum" ]; then
	npm ci --no-audit --no-fund
	echo "$checksum" > "$stamp"
fi

exec "$@"
