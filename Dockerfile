#syntax=docker/dockerfile:1

# Based on https://github.com/dunglas/symfony-docker without Mercure, Vulcain and worker mode.

# Versions
FROM dunglas/frankenphp:1.13-php8.5-trixie AS frankenphp_upstream
FROM node:26-alpine AS node_upstream


# Base application image
FROM frankenphp_upstream AS app_base

SHELL ["/bin/bash", "-euxo", "pipefail", "-c"]

WORKDIR /app

# hadolint ignore=DL3008
RUN <<-EOF
	apt-get update
	apt-get install -y --no-install-recommends \
		file \
		git
	install-php-extensions \
		@composer \
		apcu \
		intl \
		opcache \
		pdo_mysql \
		zip
	rm -rf /var/lib/apt/lists/*
EOF

# https://getcomposer.org/doc/03-cli.md#composer-allow-superuser
ENV COMPOSER_ALLOW_SUPERUSER=1

ENV PHP_INI_SCAN_DIR=":$PHP_INI_DIR/app.conf.d"

COPY --link docker/frankenphp/conf.d/10-app.ini $PHP_INI_DIR/app.conf.d/
COPY --link --chmod=755 docker/frankenphp/docker-entrypoint.sh /usr/local/bin/docker-entrypoint
COPY --link docker/frankenphp/Caddyfile /etc/frankenphp/Caddyfile

ENTRYPOINT ["docker-entrypoint"]
CMD [ "frankenphp", "run", "--config", "/etc/frankenphp/Caddyfile" ]


# Development image
FROM app_base AS app_dev

SHELL ["/bin/bash", "-euxo", "pipefail", "-c"]

ENV APP_ENV=dev
ENV XDEBUG_MODE=off

RUN <<-EOF
	mv "$PHP_INI_DIR/php.ini-development" "$PHP_INI_DIR/php.ini"
	install-php-extensions xdebug
	git config --system --add safe.directory /app
EOF

COPY --link docker/frankenphp/conf.d/20-app.dev.ini $PHP_INI_DIR/app.conf.d/


# Production frontend assets
FROM node_upstream AS frontend_build

WORKDIR /srv/frontend

COPY --link frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY --link frontend/ ./
RUN npm run build


# Production application builder
FROM app_base AS app_prod_builder

SHELL ["/bin/bash", "-euxo", "pipefail", "-c"]

ENV APP_ENV=prod

RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"

COPY --link docker/frankenphp/conf.d/20-app.prod.ini $PHP_INI_DIR/app.conf.d/

# Keep the vendor layer when only the application source changes
COPY --link backend/composer.* backend/symfony.* ./
RUN composer install --no-cache --prefer-dist --no-dev --no-autoloader --no-scripts --no-progress

COPY --link backend/ ./
COPY --link --from=frontend_build /srv/backend/public/build public/build

RUN <<-EOF
	mkdir -p var/cache var/log var/share
	composer dump-autoload --classmap-authoritative --no-dev
	composer dump-env prod
	composer run-script --no-dev post-install-cmd
	chmod +x bin/console
	chmod -R g=u var
	sync
EOF

# Collect shared libraries needed by FrankenPHP and PHP extensions
# hadolint ignore=DL3008,SC3054
RUN <<-'EOF'
	apt-get update
	apt-get install -y --no-install-recommends libtree
	mkdir -p /tmp/libs
	BINARIES=(frankenphp php file)
	for target in $(printf '%s\n' "${BINARIES[@]}" | xargs -I{} which {}) \
		$(find "$(php -r 'echo ini_get("extension_dir");')" -maxdepth 2 -name "*.so"); do
		libtree -pv "$target" 2>/dev/null | grep -oP '(?:── )\K/\S+(?= \[)' | while IFS= read -r lib; do
			[ -f "$lib" ] && cp -n "$lib" /tmp/libs/
		done
	done
	rm -rf /var/lib/apt/lists/*
EOF


# Production image
FROM debian:13-slim AS app_prod

SHELL ["/bin/bash", "-euxo", "pipefail", "-c"]

ENV APP_ENV=prod
ENV PHP_INI_SCAN_DIR=":/usr/local/etc/php/app.conf.d"

COPY --from=app_prod_builder /usr/local/bin/frankenphp /usr/local/bin/frankenphp
COPY --from=app_prod_builder /usr/local/bin/php /usr/local/bin/php
COPY --from=app_prod_builder /usr/local/bin/docker-php-entrypoint /usr/local/bin/docker-php-entrypoint
COPY --from=app_prod_builder /usr/local/lib/php/extensions /usr/local/lib/php/extensions
COPY --from=app_prod_builder /tmp/libs /usr/lib

COPY --from=app_prod_builder /usr/local/etc/php/conf.d /usr/local/etc/php/conf.d
COPY --from=app_prod_builder /usr/local/etc/php/php.ini /usr/local/etc/php/php.ini
COPY --from=app_prod_builder /usr/local/etc/php/app.conf.d /usr/local/etc/php/app.conf.d

COPY --from=app_prod_builder /etc/frankenphp/Caddyfile /etc/frankenphp/Caddyfile

# CA certificates for TLS, file/libmagic for Symfony MIME type detection
COPY --from=app_prod_builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
COPY --from=app_prod_builder /etc/ssl/openssl.cnf /etc/ssl/openssl.cnf
COPY --from=app_prod_builder /usr/bin/file /usr/bin/file
COPY --from=app_prod_builder /usr/lib/file/magic.mgc /usr/lib/file/magic.mgc

ENV OPENSSL_CONF=/etc/ssl/openssl.cnf XDG_CONFIG_HOME=/config XDG_DATA_HOME=/data SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt

RUN <<-EOF
	mkdir -p /data/caddy /config/caddy
	chown -R www-data:www-data /data /config
	# Remove setuid/setgid bits
	find / -perm /6000 -type f -exec chmod a-s {} + 2>/dev/null || true
EOF

COPY --link --exclude=var --from=app_prod_builder /app /app
COPY --chown=www-data:0 --from=app_prod_builder /app/var /app/var
RUN chmod g=u /app/var

COPY --link --chmod=755 docker/frankenphp/docker-entrypoint.sh /usr/local/bin/docker-entrypoint

# www-data, numeric so runtimes can verify runAsNonRoot
USER 33

WORKDIR /app

ENTRYPOINT ["docker-entrypoint"]
CMD [ "frankenphp", "run", "--config", "/etc/frankenphp/Caddyfile" ]
