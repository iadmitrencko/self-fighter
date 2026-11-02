<?php

declare(strict_types=1);

namespace App\Shared\Presentation\Http;

use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\KernelEvents;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

/**
 * Limits the writes of each user. Far above a real workout pace, it keeps a script from filling the database.
 */
#[AsEventListener(event: KernelEvents::REQUEST, priority: 4)]
final readonly class WriteLimit
{
    public function __construct(
        private TokenStorageInterface $tokens,
        private RateLimiterFactoryInterface $apiWriteLimiter,
    ) {
    }

    // Runs after the firewall (priority 8), which has found the user by then.
    public function __invoke(RequestEvent $event): void
    {
        $user = $this->tokens->getToken()?->getUser();

        if (!$event->isMainRequest() || $event->getRequest()->isMethodSafe() || !$user instanceof SecurityUser) {
            return;
        }

        $limit = $this->apiWriteLimiter->create($user->id->value)->consume();

        if (!$limit->isAccepted()) {
            throw ApiProblem::tooManyRequests($limit);
        }
    }
}
