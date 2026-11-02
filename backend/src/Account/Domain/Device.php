<?php

declare(strict_types=1);

namespace App\Account\Domain;

use App\Shared\Domain\UserId;

/**
 * A browser that holds the device cookie (section 3.7 of the plan).
 */
final class Device
{
    // The longest lifetime Chrome gives a cookie. A device unseen for this long has lost it anyway.
    public const int LIFETIME_DAYS = 400;

    // Renewing the cookie on every request would rewrite the device on every request.
    private const int RENEWAL_DAYS = 1;

    private function __construct(
        private readonly DeviceId $id,
        private readonly UserId $owner,
        // Only the hash is kept, so a copy of the database signs nobody in.
        private readonly string $tokenHash,
        private readonly \DateTimeImmutable $createdAt,
        private \DateTimeImmutable $lastSeenAt,
    ) {
    }

    public static function register(UserId $owner, DeviceToken $token, \DateTimeImmutable $now): self
    {
        return new self(DeviceId::generate(), $owner, $token->hash(), $now, $now);
    }

    public function id(): DeviceId
    {
        return $this->id;
    }

    public function owner(): UserId
    {
        return $this->owner;
    }

    public function lastSeenAt(): \DateTimeImmutable
    {
        return $this->lastSeenAt;
    }

    public function isDueForRenewal(\DateTimeImmutable $now): bool
    {
        return $this->lastSeenAt->modify(\sprintf('+%d days', self::RENEWAL_DAYS)) <= $now;
    }

    public function markSeen(\DateTimeImmutable $now): void
    {
        $this->lastSeenAt = $now;
    }
}
