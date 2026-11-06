<?php

declare(strict_types=1);

namespace App\Account\Infrastructure\Google;

use App\Account\Application\ExternalIdentity;
use App\Account\Application\GoogleAccounts;
use App\Account\Application\SignInFailed;
use App\Account\Domain\Identity;
use App\Account\Domain\IdentityProvider;
use Psr\Clock\ClockInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Contracts\HttpClient\Exception\ExceptionInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * The authorization code flow of Google with PKCE (OpenID Connect). The ID token comes straight
 * from the token endpoint of Google over HTTPS in exchange for the secret of the client, so Google
 * vouches for it and its signature needs no check; its claims still have to name this client.
 * The tokens of Google are used once and never kept (§23.2).
 */
final readonly class GoogleOAuth implements GoogleAccounts
{
    // The ID, the email, the name and the photo: nothing else of the person (§23.2).
    private const string SCOPES = 'openid email profile';
    private const array ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
    // Tolerates clocks of the server and of Google that differ a little.
    private const int LEEWAY_SECONDS = 300;
    private const float TIMEOUT_SECONDS = 10.0;

    public function __construct(
        private HttpClientInterface $httpClient,
        private ClockInterface $clock,
        #[Autowire(env: 'GOOGLE_CLIENT_ID')]
        private string $clientId,
        #[Autowire(env: 'GOOGLE_CLIENT_SECRET')]
        private string $clientSecret,
        // The end-to-end tests point these at a fake Google.
        #[Autowire(env: 'GOOGLE_AUTHORIZATION_URL')]
        private string $authorizationEndpoint,
        #[Autowire(env: 'GOOGLE_TOKEN_URL')]
        private string $tokenEndpoint,
    ) {
    }

    public function isConfigured(): bool
    {
        return '' !== $this->clientId && '' !== $this->clientSecret;
    }

    public function authorizationUrl(string $callbackUrl, string $state, string $codeVerifier): string
    {
        return $this->authorizationEndpoint.'?'.http_build_query([
            'client_id' => $this->clientId,
            'redirect_uri' => $callbackUrl,
            'response_type' => 'code',
            'scope' => self::SCOPES,
            'state' => $state,
            'code_challenge' => self::base64Url(hash('sha256', $codeVerifier, true)),
            'code_challenge_method' => 'S256',
            // The person picks the account every time, so a shared computer opens no account by itself.
            'prompt' => 'select_account',
        ], '', '&', \PHP_QUERY_RFC3986);
    }

    public function identify(string $callbackUrl, string $code, string $codeVerifier): ExternalIdentity
    {
        try {
            $answer = $this->httpClient->request('POST', $this->tokenEndpoint, [
                'headers' => ['Accept' => 'application/json'],
                'body' => [
                    'grant_type' => 'authorization_code',
                    'code' => $code,
                    'code_verifier' => $codeVerifier,
                    'redirect_uri' => $callbackUrl,
                    'client_id' => $this->clientId,
                    'client_secret' => $this->clientSecret,
                ],
                'timeout' => self::TIMEOUT_SECONDS,
                'max_duration' => self::TIMEOUT_SECONDS,
            ])->toArray();
        } catch (ExceptionInterface $exception) {
            throw new SignInFailed('Google did not exchange the code.', 0, $exception);
        }

        return $this->identity(self::claims($answer['id_token'] ?? null));
    }

    /**
     * @param array<string, mixed> $claims
     */
    private function identity(array $claims): ExternalIdentity
    {
        $audience = $claims['aud'] ?? null;
        $subject = $claims['sub'] ?? null;
        $expiresAt = $claims['exp'] ?? null;

        if (!\in_array($claims['iss'] ?? null, self::ISSUERS, true)
            || !(\is_string($audience) ? $audience === $this->clientId : \is_array($audience) && \in_array($this->clientId, $audience, true))
            || !\is_int($expiresAt) || $expiresAt + self::LEEWAY_SECONDS < $this->clock->now()->getTimestamp()
            || !\is_string($subject) || 1 !== preg_match('/^[\x21-\x7E]{1,'.Identity::SUBJECT_MAX.'}$/D', $subject)
        ) {
            throw new SignInFailed('The ID token of Google is not meant for this client.');
        }

        $email = $claims['email'] ?? null;
        $name = $claims['name'] ?? null;

        return new ExternalIdentity(
            IdentityProvider::Google,
            $subject,
            \is_string($email) && true === ($claims['email_verified'] ?? null) ? $email : null,
            \is_string($name) ? $name : null,
        );
    }

    /**
     * @return array<string, mixed>
     */
    private static function claims(mixed $idToken): array
    {
        $parts = \is_string($idToken) ? explode('.', $idToken) : [];
        $payload = 3 === \count($parts) ? base64_decode(strtr($parts[1], '-_', '+/'), true) : false;
        $claims = false === $payload ? null : json_decode($payload, true);

        if (!\is_array($claims) || array_is_list($claims)) {
            throw new SignInFailed('Google sent no ID token.');
        }

        return $claims;
    }

    private static function base64Url(string $bytes): string
    {
        return rtrim(strtr(base64_encode($bytes), '+/', '-_'), '=');
    }
}
