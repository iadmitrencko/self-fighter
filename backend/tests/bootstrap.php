<?php

declare(strict_types=1);

use Symfony\Component\Dotenv\Dotenv;
use Symfony\Component\Filesystem\Filesystem;

require dirname(__DIR__).'/vendor/autoload.php';

(new Dotenv())->bootEnv(dirname(__DIR__).'/.env');

if ($_SERVER['APP_DEBUG']) {
    umask(0000);
}

// Tests that switch debugging off render the error pages, and without debugging Twig never
// checks whether its compiled templates are still fresh.
(new Filesystem())->remove(dirname(__DIR__).'/var/cache/test/twig');

// The test database follows the same migrations as production and holds the content of the
// site, as a deployment leaves it. Separate processes keep these changes away from the connection
// that wraps every test in a transaction.
foreach (['doctrine:migrations:migrate --allow-no-migration', 'app:content:sync'] as $command) {
    passthru(sprintf(
        '%s %s %s --env=test --no-interaction --quiet',
        escapeshellarg(PHP_BINARY),
        escapeshellarg(dirname(__DIR__).'/bin/console'),
        $command,
    ), $exitCode);

    if (0 !== $exitCode) {
        throw new RuntimeException(sprintf('"%s" failed for the test database.', $command));
    }
}
