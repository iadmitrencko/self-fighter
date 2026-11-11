#!/bin/sh
# Checks a running deployment from the outside: smoke-test.sh <base-url>
# Set SMOKE_INSECURE=1 to accept the self-signed certificate of a local stack,
# and SMOKE_WWW to the www address of the site to check that it leads to the main one.
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
expect_status 200 /game
expect_status 200 /game/fight
expect_status 404 /game/unknown
# §24.1: the workouts of /workout are gone, and their old addresses lead into the game.
expect_status 302 /workout
expect_status 404 /missing
expect_status 200 /favicon.ico
expect_status 200 /api/v1/me
expect_status 401 /api/v1/attempts

me=$(request "$base_url/api/v1/me")
[ "$me" = '{"user":null}' ] || fail "/api/v1/me answered $me to a new visitor"
echo 'ok: a new visitor has no user'

home=$(request "$base_url/")
case "$home" in
*'lang="uk"'*) echo 'ok: the home page declares its language' ;;
*) fail 'the home page does not declare lang="uk"' ;;
esac
case "$home" in
*noindex*) fail 'the home page is closed from indexing' ;;
*) echo 'ok: the home page can be indexed' ;;
esac

# Section 6.3 of the plan: production is open to search engines and names its sitemap.
robots=$(request "$base_url/robots.txt")
case "$robots" in
*'Sitemap: '*) echo 'ok: robots.txt opens the site and names the sitemap' ;;
*) fail 'robots.txt closes the site from search engines' ;;
esac
expect_status 200 /sitemap.xml
expect_status 200 /guides
expect_status 200 /og.png

if [ -n "${SMOKE_WWW:-}" ]; then
	redirect=$(request --output /dev/null --write-out '%{http_code} %{redirect_url}' "$SMOKE_WWW/guides")
	[ "$redirect" = "301 $base_url/guides" ] || fail "$SMOKE_WWW/guides answered \"$redirect\" instead of a redirect to $base_url"
	echo 'ok: the www address leads to the main one'
fi

game=$(request "$base_url/game")
case "$game" in
*'noindex, follow'*) echo 'ok: the game is not indexed' ;;
*) fail 'the game is missing noindex' ;;
esac

script=$(printf '%s' "$game" | sed -n 's|.*src="\(/build/assets/[^"]*\.js\)".*|\1|p' | head -n 1)
[ -n "$script" ] || fail 'the game does not reference a built script'
expect_status 200 "$script"

cache=$(request --head "$base_url$script" | tr -d '\r' | grep -i '^cache-control:' || true)
case "$cache" in
*immutable*) echo 'ok: built files are cached for good' ;;
*) fail "the built script is served with \"$cache\" instead of an immutable cache" ;;
esac

font=$(printf '%s' "$home" | sed -n 's|.*rel="preload" href="\(/build/assets/[^"]*\.woff2\)".*|\1|p' | head -n 1)
[ -n "$font" ] || fail 'the home page does not preload the font of its heading'
expect_status 200 "$font"
