<?php

declare(strict_types=1);

namespace App\Shared\Application;

/**
 * The ways to sign in the game may offer (§23.2). The page of the game names them, so a server
 * without a client of Google hides the button instead of leading to a sign-in that fails.
 */
interface SignInMethods
{
    /**
     * @return list<string> such as ['google']
     */
    public function available(): array;
}
