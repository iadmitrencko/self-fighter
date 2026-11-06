<?php

declare(strict_types=1);

namespace App\Account\Application;

/**
 * Signing in with Google by the authorization code flow with PKCE (section 3.7 of the plan). The
 * server talks to Google itself, so the pages load no scripts of Google, and it keeps no tokens.
 */
interface GoogleAccounts
{
    // Without a client of Google Cloud the game hides its sign-in button.
    public function isConfigured(): bool;

    /**
     * The page of Google where the person picks an account. Google sends the browser back to the
     * callback with a code and the same state.
     */
    public function authorizationUrl(string $callbackUrl, string $state, string $codeVerifier): string;

    /**
     * Trades the code for the identity of the person. Only the holder of the verifier, the server
     * that started the sign-in, can do that.
     *
     * @throws SignInFailed
     */
    public function identify(string $callbackUrl, string $code, string $codeVerifier): ExternalIdentity;
}
