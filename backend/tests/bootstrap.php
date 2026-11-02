<?php

declare(strict_types=1);

use Symfony\Component\Dotenv\Dotenv;

require dirname(__DIR__).'/vendor/autoload.php';

(new Dotenv())->bootEnv(dirname(__DIR__).'/.env');

if ($_SERVER['APP_DEBUG']) {
    umask(0000);
}

// The test database follows the same migrations as production. A separate process keeps
// the schema changes away from the connection that wraps every test in a transaction.
passthru(sprintf(
    '%s %s doctrine:migrations:migrate --env=test --no-interaction --allow-no-migration --quiet',
    escapeshellarg(PHP_BINARY),
    escapeshellarg(dirname(__DIR__).'/bin/console'),
), $exitCode);

if (0 !== $exitCode) {
    throw new RuntimeException('The migrations of the test database failed.');
}
