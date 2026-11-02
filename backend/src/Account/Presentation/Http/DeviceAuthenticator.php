<?php

declare(strict_types=1);

namespace App\Account\Presentation\Http;

use App\Account\Application\IdentifyDevice;
use App\Shared\Presentation\Http\SecurityUser;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Security\Core\Exception\BadCredentialsException;
use Symfony\Component\Security\Http\Authenticator\AbstractAuthenticator;
use Symfony\Component\Security\Http\Authenticator\Passport\Badge\UserBadge;
use Symfony\Component\Security\Http\Authenticator\Passport\Passport;
use Symfony\Component\Security\Http\Authenticator\Passport\SelfValidatingPassport;
use Symfony\Component\Security\Http\EntryPoint\AuthenticationEntryPointInterface;

/**
 * Finds the user of a request by the device cookie. Guests and signed-in users go the same way.
 */
final class DeviceAuthenticator extends AbstractAuthenticator implements AuthenticationEntryPointInterface
{
    public function __construct(
        private readonly DeviceCookie $cookie,
        private readonly IdentifyDevice $identifyDevice,
    ) {
    }

    public function supports(Request $request): bool
    {
        return $this->cookie->isSent($request);
    }

    public function authenticate(Request $request): Passport
    {
        $token = $this->cookie->read($request)
            ?? throw new BadCredentialsException('The device cookie is malformed.');
        $device = ($this->identifyDevice)($token)
            ?? throw new BadCredentialsException('The device cookie is unknown.');

        DeviceCookieRenewal::remember($request, $device, $token);
        $user = new SecurityUser($device->owner());

        return new SelfValidatingPassport(new UserBadge($user->getUserIdentifier(), static fn () => $user));
    }

    public function onAuthenticationSuccess(Request $request, TokenInterface $token, string $firewallName): ?Response
    {
        return null;
    }

    // The data behind a stale cookie is gone: carry on without a user and let the browser forget the cookie.
    public function onAuthenticationFailure(Request $request, AuthenticationException $exception): ?Response
    {
        DeviceCookieRenewal::forget($request);

        return null;
    }

    public function start(Request $request, ?AuthenticationException $authException = null): Response
    {
        return new JsonResponse(['error' => 'unauthorized'], Response::HTTP_UNAUTHORIZED);
    }
}
