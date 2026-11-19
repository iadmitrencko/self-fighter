<?php

declare(strict_types=1);

namespace App\Analytics\Application;

use App\Analytics\Domain\Event;
use App\Analytics\Domain\EventId;
use App\Analytics\Domain\EventRepository;
use App\Shared\Application\Refusal;
use App\Shared\Application\UserTransaction;
use App\Shared\Domain\UserId;
use Psr\Clock\ClockInterface;

/**
 * Keeps an event the game sent after the player allowed analytics (§22). The game needs an
 * account (§23.1), so the event names the user.
 */
final readonly class RecordEvent
{
    public function __construct(
        private EventFormat $format,
        private EventRepository $events,
        private UserTransaction $userTransaction,
        private ClockInterface $clock,
    ) {
    }

    /**
     * @throws Refusal
     */
    public function __invoke(UserId $user, string $json): void
    {
        $fields = $this->format->readEvent($json);
        $event = null === $fields ? null : Event::record(EventId::generate(), $fields, $user, $this->clock->now());

        if (null === $event) {
            throw Refusal::invalid('invalid-event');
        }

        // The lock of the user keeps an event from naming a user deleted at the same moment (§15.5).
        $this->userTransaction->run($user, fn () => $this->events->add($event));
    }
}
