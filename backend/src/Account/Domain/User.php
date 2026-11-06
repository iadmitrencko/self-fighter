<?php

declare(strict_types=1);

namespace App\Account\Domain;

use App\Shared\Domain\UserId;

/**
 * Everyone who has saved something (§15.1). A guest has no way to sign in, and the browser finds
 * it by its device. Signing in adds an Identity to the same user, so its data stays where it is (§23.3).
 */
final class User
{
    // The longest address RFC 5321 lets through.
    public const int EMAIL_MAX = 254;
    public const int NAME_MAX = 100;

    private function __construct(
        private readonly UserId $id,
        private readonly \DateTimeImmutable $createdAt,
        // What the provider of the sign-in tells about the person; a guest has neither (§23.2).
        private ?string $email = null,
        private ?string $name = null,
    ) {
    }

    public static function signUp(UserId $id, \DateTimeImmutable $now): self
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

    public function email(): ?string
    {
        return $this->email;
    }

    public function name(): ?string
    {
        return $this->name;
    }

    /**
     * Every sign-in brings the current name and email, so a change on the side of Google shows here
     * too. Only a confirmed email is kept: a later sign-in with email and password relies on it (§23.4).
     */
    public function rememberProfile(?string $verifiedEmail, ?string $name): void
    {
        $email = self::clean($verifiedEmail);
        $name = self::clean($name);

        $this->email = null !== $email && mb_strlen($email) <= self::EMAIL_MAX && str_contains($email, '@') ? $email : null;
        $this->name = null === $name ? null : mb_substr($name, 0, self::NAME_MAX);
    }

    private static function clean(?string $text): ?string
    {
        // Line breaks and invisible characters become a space, and spaces in a row become one.
        $trimmed = null === $text ? '' : trim((string) preg_replace('/[\s\p{Cc}\p{Cf}\p{Z}]+/u', ' ', $text));

        return '' === $trimmed ? null : $trimmed;
    }
}
