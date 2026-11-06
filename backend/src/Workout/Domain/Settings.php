<?php

declare(strict_types=1);

namespace App\Workout\Domain;

use App\Shared\Domain\UserId;

/**
 * The last configuration of each mode of one user, so the next workout starts from it.
 */
final class Settings
{
    /**
     * @param array<string, array<mixed>> $configurations keyed by the mode
     */
    private function __construct(
        private readonly UserId $owner,
        private array $configurations,
        private \DateTimeImmutable $updatedAt,
    ) {
    }

    public static function empty(UserId $owner, \DateTimeImmutable $now): self
    {
        return new self($owner, [], $now);
    }

    /**
     * @param array<mixed> $configuration a configuration of the mode, checked against the schema
     */
    public function remember(Mode $mode, array $configuration, \DateTimeImmutable $now): void
    {
        $this->configurations[$mode->value] = $configuration;
        $this->updatedAt = $now;
    }

    // §23.3: a guest brings the modes the account has not set up yet; the rest stay as the account had them.
    public function takeMissingFrom(self $other, \DateTimeImmutable $now): void
    {
        $missing = array_diff_key($other->configurations, $this->configurations);

        if ([] !== $missing) {
            $this->configurations += $missing;
            $this->updatedAt = $now;
        }
    }

    /**
     * @return array<string, array<mixed>>
     */
    public function configurations(): array
    {
        return $this->configurations;
    }
}
