<?php

declare(strict_types=1);

namespace App\Account\Domain;

use App\Shared\Domain\UserId;

/**
 * A browser that holds the device cookie (section 3.7 of the plan). It leads to the user of the
 * browser and remembers the guest of the browser while an account is signed in, so signing out
 * brings that guest back (§23.3).
 */
final class Device
{
    // The longest lifetime Chrome gives a cookie. A device unseen for this long has lost it anyway.
    public const int LIFETIME_DAYS = 400;

    // Renewing the cookie on every request would rewrite the device on every request.
    private const int RENEWAL_DAYS = 1;

    private function __construct(
        private readonly DeviceId $id,
        private UserId $owner,
        // Only the hash is kept, so a copy of the database signs nobody in.
        private string $tokenHash,
        private readonly \DateTimeImmutable $createdAt,
        private \DateTimeImmutable $lastSeenAt,
        // The guest whose data the signed-in account has not taken in; only an account has one.
        private ?UserId $guest = null,
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

    public function guest(): ?UserId
    {
        return $this->guest;
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

    /**
     * The browser opens the account. The token changes with it, so a token planted in the browser
     * beforehand opens nothing, and the old one stops working.
     */
    public function signIn(UserId $account, ?UserId $guest, DeviceToken $token, \DateTimeImmutable $now): void
    {
        $this->owner = $account;
        $this->guest = $guest;
        $this->tokenHash = $token->hash();
        $this->lastSeenAt = $now;
    }

    /**
     * Signing out brings back the guest of the browser with a new token. Returns false when the
     * browser has no guest: then the device has nobody to lead to.
     */
    public function signOut(DeviceToken $token, \DateTimeImmutable $now): bool
    {
        if (!$this->fallBackToGuest()) {
            return false;
        }
        $this->tokenHash = $token->hash();
        $this->lastSeenAt = $now;

        return true;
    }

    // The account is gone: the browser keeps its cookie and finds its guest by it again.
    public function fallBackToGuest(): bool
    {
        if (null === $this->guest) {
            return false;
        }
        $this->owner = $this->guest;
        $this->guest = null;

        return true;
    }

    public function forgetGuest(): void
    {
        $this->guest = null;
    }
}
