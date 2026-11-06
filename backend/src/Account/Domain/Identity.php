<?php

declare(strict_types=1);

namespace App\Account\Domain;

use App\Shared\Domain\Instant;
use App\Shared\Domain\UserId;

/**
 * A way to sign in that leads to a user (section 3.7 of the plan). A user with one is an account,
 * a user without one is a guest. Google is found by its `sub`, which never changes, unlike the email.
 */
final class Identity
{
    // Google allows up to 255 ASCII characters.
    public const int SUBJECT_MAX = 255;

    private function __construct(
        // The value of IdentityProvider: Doctrine maps no enum as a part of an identifier.
        private readonly string $provider,
        private readonly string $subject,
        private readonly UserId $user,
        private readonly \DateTimeImmutable $createdAt,
    ) {
    }

    public static function link(IdentityProvider $provider, string $subject, UserId $user, \DateTimeImmutable $now): self
    {
        return new self($provider->value, $subject, $user, $now->setMicrosecond(0));
    }

    public function user(): UserId
    {
        return $this->user;
    }

    /**
     * The way to sign in as the export of the user shows it (§15.5).
     *
     * @return array{provider: string, subject: string, createdAt: string}
     */
    public function describe(): array
    {
        return [
            'provider' => $this->provider,
            'subject' => $this->subject,
            'createdAt' => Instant::format($this->createdAt),
        ];
    }
}
