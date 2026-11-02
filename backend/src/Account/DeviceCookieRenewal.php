<?php

declare(strict_types=1);

namespace App\Account;

use App\Entity\Device;
use App\Repository\DeviceRepository;
use Psr\Clock\ClockInterface;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\KernelEvents;

/**
 * Keeps the device cookie alive while the browser is in use and removes a stale one.
 */
#[AsEventListener(event: KernelEvents::RESPONSE)]
final readonly class DeviceCookieRenewal
{
    private const string DEVICE = '_device';
    private const string TOKEN = '_device_token';
    private const string FORGET = '_device_forget';

    public function __construct(
        private DeviceCookie $cookie,
        private DeviceRepository $devices,
        private ClockInterface $clock,
    ) {
    }

    public static function remember(Request $request, Device $device, DeviceToken $token): void
    {
        $request->attributes->set(self::DEVICE, $device);
        $request->attributes->set(self::TOKEN, $token);
    }

    public static function forget(Request $request): void
    {
        $request->attributes->set(self::FORGET, true);
    }

    public function __invoke(ResponseEvent $event): void
    {
        $request = $event->getRequest();
        $response = $event->getResponse();

        // The controller has already issued or removed the cookie.
        if (!$event->isMainRequest() || $this->cookie->isSetBy($response)) {
            return;
        }

        if ($request->attributes->getBoolean(self::FORGET)) {
            $this->cookie->remove($response);

            return;
        }

        $device = $request->attributes->get(self::DEVICE);
        $token = $request->attributes->get(self::TOKEN);

        if ($device instanceof Device && $token instanceof DeviceToken && $this->cookie->isDueForRenewal($device->getLastSeenAt())) {
            $this->devices->markSeen($device, $this->clock->now());
            $this->cookie->issue($response, $token);
        }
    }
}
