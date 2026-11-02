<?php

declare(strict_types=1);

namespace App\Account\Domain;

use App\Shared\Domain\UserId;

/**
 * Everyone who has saved something (§15.1). Until sign-in arrives (stage 9) every user is a
 * guest, and the browser finds it by its device.
 */
final class User
{
    private function __construct(
        private readonly UserId $id,
        private readonly \DateTimeImmutable $createdAt,
    ) {
    }

    public static function signUpGuest(UserId $id, \DateTimeImmutable $now): self
    {
        // The database keeps whole seconds, so the user looks the same before and after a reload.
        return new self($id, $now->setMicrosecond(0));
    }

    public function id(): UserId
    {
        return $this->id;
    }

    public function createdAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }
}
