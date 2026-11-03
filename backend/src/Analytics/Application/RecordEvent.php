<?php

declare(strict_types=1);

namespace App\Analytics\Application;

use App\Analytics\Domain\Event;
use App\Analytics\Domain\EventId;
use App\Analytics\Domain\EventRepository;
use App\Shared\Application\Refusal;
use App\Shared\Application\Transaction;
use App\Shared\Application\UserTransaction;
use App\Shared\Domain\UserId;
use Psr\Clock\ClockInterface;

/**
 * Keeps an event the browser sent after the visitor allowed analytics (§22). A visitor who has
 * saved nothing yet has no user, and the event stays without one.
 */
final readonly class RecordEvent
{
    public function __construct(
        private EventFormat $format,
        private EventRepository $events,
        private Transaction $transaction,
        private UserTransaction $userTransaction,
        private ClockInterface $clock,
    ) {
    }

    /**
     * @throws Refusal
     */
    public function __invoke(?UserId $user, string $json): void
    {
        $fields = $this->format->readEvent($json);
        $event = null === $fields ? null : Event::record(EventId::generate(), $fields, $user, $this->clock->now());

        if (null === $event) {
            throw Refusal::invalid('invalid-event');
        }
        $add = fn () => $this->events->add($event);

        // The lock of the user keeps an event from naming a user deleted at the same moment (§15.5).
        null === $user ? $this->transaction->run($add) : $this->userTransaction->run($user, $add);
    }
}
