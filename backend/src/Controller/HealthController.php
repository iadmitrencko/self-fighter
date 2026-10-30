<?php

declare(strict_types=1);

namespace App\Controller;

use Doctrine\DBAL\Connection;
use Doctrine\DBAL\Exception as DbalException;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class HealthController
{
    private const HEADERS = ['Content-Type' => 'text/plain', 'Cache-Control' => 'no-store'];

    #[Route('/healthz', name: 'healthz', methods: ['GET'])]
    public function __invoke(Connection $connection): Response
    {
        try {
            $connection->executeQuery('SELECT 1');
        } catch (DbalException) {
            return new Response('unavailable', Response::HTTP_SERVICE_UNAVAILABLE, self::HEADERS);
        }

        return new Response('ok', Response::HTTP_OK, self::HEADERS);
    }
}
