<?php

declare(strict_types=1);

namespace App\Shared\Presentation\Http;

use App\Shared\Application\DatabaseStatus;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final readonly class HealthController
{
    private const array HEADERS = ['Content-Type' => 'text/plain', 'Cache-Control' => 'no-store'];

    public function __construct(private DatabaseStatus $database)
    {
    }

    #[Route('/healthz', name: 'healthz', methods: ['GET'])]
    public function __invoke(): Response
    {
        return $this->database->isAvailable()
            ? new Response('ok', Response::HTTP_OK, self::HEADERS)
            : new Response('unavailable', Response::HTTP_SERVICE_UNAVAILABLE, self::HEADERS);
    }
}
