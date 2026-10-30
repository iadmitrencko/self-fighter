#!/bin/sh
set -e

# Production images are immutable: dependencies are baked in, and deployments
# run migrations in a separate container before the application starts.
if [ "$1" = 'frankenphp' ] && [ "$APP_ENV" != 'prod' ]; then
	composer install --prefer-dist --no-progress --no-interaction
	php bin/console doctrine:migrations:migrate --no-interaction --all-or-nothing --allow-no-migration
fi

exec docker-php-entrypoint "$@"
