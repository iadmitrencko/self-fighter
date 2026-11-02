<?php

declare(strict_types=1);

namespace App\Shared\Domain;

/**
 * The user every module refers to. Only the Account module knows anything else about a user.
 */
final readonly class UserId extends Uuid7
{
}
