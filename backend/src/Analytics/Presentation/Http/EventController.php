<?php

declare(strict_types=1);

namespace App\Analytics\Presentation\Http;

use App\Analytics\Application\RecordEvent;
use App\Shared\Domain\UserId;
use App\Shared\Presentation\Http\ApiProblem;
use App\Shared\Presentation\Http\JsonBody;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\Routing\Attribute\Route;

/**
 * The events of §19. The browser sends them only after the visitor allowed analytics (§22).
 */
final readonly class EventController
{
    // An event has three short fields.
    private const int MAX_BYTES = 512;

    public function __construct(
        private RecordEvent $recordEvent,
        private RateLimiterFactoryInterface $analyticsEventLimiter,
    ) {
    }

    // The user comes from the device cookie, never from the body. An event creates no guest.
    #[Route('/api/v1/events', name: 'api_events', methods: ['POST'])]
    public function record(Request $request, ?UserId $user): Response
    {
        $limit = $this->analyticsEventLimiter->create($user->value ?? 'address:'.$request->getClientIp())->consume();

        if (!$limit->isAccepted()) {
            throw ApiProblem::tooManyRequests($limit);
        }
        ($this->recordEvent)($user, JsonBody::read($request, self::MAX_BYTES));

        return new Response(null, Response::HTTP_NO_CONTENT);
    }
}
