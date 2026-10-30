#!/bin/sh
# Checks a running deployment from the outside: smoke-test.sh <base-url>
# Set SMOKE_INSECURE=1 to accept the self-signed certificate of a local stack.
set -eu

base_url=${1:?Usage: smoke-test.sh <base-url>}

request() {
	if [ "${SMOKE_INSECURE:-0}" = 1 ]; then
		curl --silent --show-error --max-time 15 --insecure "$@"
	else
		curl --silent --show-error --max-time 15 "$@"
	fi
}

fail() {
	echo "FAIL: $1" >&2
	exit 1
}

expect_status() {
	actual=$(request --output /dev/null --write-out '%{http_code}' "$base_url$2")
	[ "$actual" = "$1" ] || fail "$2 returned HTTP $actual instead of $1"
	echo "ok: $2 returns HTTP $1"
}

expect_status 200 /healthz
expect_status 200 /
expect_status 200 /workout
expect_status 404 /workout/unknown

home=$(request "$base_url/")
case "$home" in
*'lang="uk"'*) echo 'ok: the home page declares its language' ;;
*) fail 'the home page does not declare lang="uk"' ;;
esac
case "$home" in
*noindex*) fail 'the home page is closed from indexing' ;;
*) echo 'ok: the home page can be indexed' ;;
esac

workout=$(request "$base_url/workout")
case "$workout" in
*'noindex, follow'*) echo 'ok: the workout page is not indexed' ;;
*) fail 'the workout page is missing noindex' ;;
esac

script=$(printf '%s' "$workout" | sed -n 's|.*src="\(/build/assets/[^"]*\.js\)".*|\1|p' | head -n 1)
[ -n "$script" ] || fail 'the workout page does not reference a built script'
expect_status 200 "$script"
