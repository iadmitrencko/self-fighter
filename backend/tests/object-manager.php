<?php

declare(strict_types=1);

// Gives PHPStan the entity manager, so it knows the mapping and checks DQL.

use App\Kernel;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Dotenv\Dotenv;

require dirname(__DIR__).'/vendor/autoload.php';

(new Dotenv())->bootEnv(dirname(__DIR__).'/.env');

$kernel = new Kernel((string) $_SERVER['APP_ENV'], (bool) $_SERVER['APP_DEBUG']);
$kernel->boot();
$doctrine = $kernel->getContainer()->get('doctrine');
assert($doctrine instanceof ManagerRegistry);

return $doctrine->getManager();
