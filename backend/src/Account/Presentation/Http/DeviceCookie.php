<?php

declare(strict_types=1);

namespace App\Account\Presentation\Http;

use App\Account\Domain\Device;
use App\Account\Domain\DeviceToken;
use Psr\Clock\ClockInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\Cookie;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * The cookie by which a browser finds its user (section 3.7 of the plan).
 */
final readonly class DeviceCookie
{
    private string $name;

    public function __construct(
        #[Autowire(param: 'app.device_cookie_secure')]
        private bool $secure,
        private ClockInterface $clock,
    ) {
        // With the __Host- prefix the browser refuses the cookie over plain HTTP or from a subdomain.
        $this->name = $secure ? '__Host-sf_device' : 'sf_device';
    }

    public function isSent(Request $request): bool
    {
        return $request->cookies->has($this->name);
    }

    public function read(Request $request): ?DeviceToken
    {
        $value = $request->cookies->get($this->name);

        return \is_string($value) ? DeviceToken::tryFrom($value) : null;
    }

    public function issue(Response $response, DeviceToken $token): void
    {
        $response->headers->setCookie(Cookie::create(
            $this->name,
            $token->value,
            $this->clock->now()->modify(\sprintf('+%d days', Device::LIFETIME_DAYS)),
            '/',
            null,
            $this->secure,
            true,
            false,
            Cookie::SAMESITE_LAX,
        ));
    }

    public function remove(Response $response): void
    {
        $response->headers->clearCookie($this->name, '/', null, $this->secure, true, Cookie::SAMESITE_LAX);
    }

    public function isSetBy(Response $response): bool
    {
        foreach ($response->headers->getCookies() as $cookie) {
            if ($cookie->getName() === $this->name) {
                return true;
            }
        }

        return false;
    }
}
