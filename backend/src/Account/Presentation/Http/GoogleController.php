<?php

declare(strict_types=1);

namespace App\Account\Presentation\Http;

use App\Account\Application\GoogleAccounts;
use App\Account\Application\SignIn;
use App\Account\Application\SignInFailed;
use App\Shared\Application\Refusal;
use Psr\Log\LoggerInterface;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

/**
 * Signing in with Google (§23.2). Only these two addresses start a session: it keeps the state and
 * the PKCE verifier of one sign-in for the way to Google and back. After that the device cookie
 * alone leads to the account. The browser returns to the screen of the game it came from, and
 * `sign-in` in the address tells the game how it went: done, cancelled or failed.
 */
final readonly class GoogleController
{
    private const string SESSION_KEY = 'google_sign_in';
    // Only screens of the game (§24) start signing in, so only they are a way back: never another site.
    private const string RETURN_PATTERN = '#^/game(?:/[a-z0-9-]+)*$#D';
    // §24.1: the settings of the game, where the player signs in and out.
    private const string DEFAULT_RETURN = '/game/settings';

    public function __construct(
        private GoogleAccounts $google,
        private SignIn $signIn,
        private DeviceCookie $cookie,
        private UrlGeneratorInterface $urls,
        private RateLimiterFactoryInterface $signInLimiter,
        private LoggerInterface $logger,
    ) {
    }

    #[Route('/connect/google', name: 'connect_google', methods: ['GET'])]
    public function start(Request $request): RedirectResponse
    {
        $returnTo = self::returnPath($request->query->all()['to'] ?? null);

        if (!$this->google->isConfigured()
            || !$this->signInLimiter->create($request->getClientIp() ?? 'unknown')->consume()->isAccepted()
        ) {
            return self::back($returnTo, 'failed');
        }

        $state = self::randomToken();
        $verifier = self::randomToken();
        $request->getSession()->set(self::SESSION_KEY, ['state' => $state, 'verifier' => $verifier, 'to' => $returnTo]);

        return new RedirectResponse($this->google->authorizationUrl($this->callbackUrl(), $state, $verifier));
    }

    #[Route('/connect/google/check', name: 'connect_google_check', methods: ['GET'])]
    public function check(Request $request): RedirectResponse
    {
        // One answer per sign-in: a repeated or forged answer finds nothing to finish.
        $pending = $request->getSession()->remove(self::SESSION_KEY);

        if (!\is_array($pending) || !\is_string($pending['state'] ?? null) || !\is_string($pending['verifier'] ?? null)) {
            return self::back(self::DEFAULT_RETURN, 'failed');
        }

        $returnTo = self::returnPath($pending['to'] ?? null);
        $query = $request->query->all();
        $state = $query['state'] ?? null;
        $code = $query['code'] ?? null;

        // The state proves that this browser started the sign-in, not a page of someone else.
        if (!\is_string($state) || !hash_equals($pending['state'], $state)) {
            return self::back($returnTo, 'failed');
        }

        if ('access_denied' === ($query['error'] ?? null)) {
            return self::back($returnTo, 'cancelled');
        }

        if (!\is_string($code) || '' === $code) {
            return self::back($returnTo, 'failed');
        }

        try {
            $identity = $this->google->identify($this->callbackUrl(), $code, $pending['verifier']);
            $token = ($this->signIn)($identity, $this->cookie->read($request));
        } catch (SignInFailed|Refusal $exception) {
            $this->logger->notice('Signing in with Google failed.', ['exception' => $exception]);

            return self::back($returnTo, 'failed');
        }

        $response = self::back($returnTo, 'done');
        $this->cookie->issue($response, $token);

        return $response;
    }

    // Google sends the browser back only to an address registered for the client (section 11 of the plan).
    private function callbackUrl(): string
    {
        return $this->urls->generate('connect_google_check', [], UrlGeneratorInterface::ABSOLUTE_URL);
    }

    private static function returnPath(mixed $path): string
    {
        return \is_string($path) && 1 === preg_match(self::RETURN_PATTERN, $path) ? $path : self::DEFAULT_RETURN;
    }

    private static function back(string $returnTo, string $outcome): RedirectResponse
    {
        return new RedirectResponse($returnTo.'?sign-in='.$outcome);
    }

    // 256 random bits, base64url: a valid PKCE verifier as well (RFC 7636).
    private static function randomToken(): string
    {
        return rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
    }
}
