<?php

declare(strict_types=1);

namespace App\Workout\Application;

use App\Shared\Application\Refusal;
use App\Shared\Application\UserTransaction;
use App\Shared\Domain\UserId;
use App\Workout\Domain\Attempt;
use App\Workout\Domain\AttemptId;
use App\Workout\Domain\AttemptRepository;

final readonly class SaveAttempt
{
    public function __construct(
        private AttemptRepository $attempts,
        private AttemptFormat $format,
        private UserTransaction $transaction,
    ) {
    }

    /**
     * @return bool true for a new attempt, false when the same attempt was saved before
     *
     * @throws Refusal
     */
    public function __invoke(UserId $owner, AttemptId $id, string $json): bool
    {
        $document = $this->format->readAttempt($json);
        $attempt = null === $document ? null : Attempt::fromDocument($owner, $document);

        if (null === $attempt || !$attempt->id()->equals($id)) {
            throw Refusal::invalid('invalid-attempt');
        }

        return $this->transaction->run($owner, function () use ($attempt, $owner): bool {
            $saved = $this->attempts->find($attempt->id());

            if (null === $saved) {
                $this->attempts->add($attempt);

                return true;
            }

            // Sending the same attempt again changes nothing, anything else under its id is refused (§17.2).
            if (!$saved->belongsTo($owner) || !$saved->hasSameDocument($attempt)) {
                throw Refusal::conflict('conflict');
            }

            return false;
        });
    }
}
