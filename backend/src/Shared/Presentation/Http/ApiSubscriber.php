<?php

declare(strict_types=1);

namespace App\Shared\Presentation\Http;

use App\Shared\Application\Refusal;
use App\Shared\Application\RefusalReason;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\KernelEvents;

/**
 * The rules every API request follows: same-origin writes, JSON errors, no caching of personal data.
 */
final readonly class ApiSubscriber implements EventSubscriberInterface
{
    private const array ERRORS = [
        Response::HTTP_BAD_REQUEST => 'bad-request',
        Response::HTTP_NOT_FOUND => 'not-found',
        Response::HTTP_METHOD_NOT_ALLOWED => 'method-not-allowed',
    ];

    public static function getSubscribedEvents(): array
    {
        return [
            // After routing, before the firewall: a cross-site write does not even reach the database.
            KernelEvents::REQUEST => ['rejectCrossSiteWrite', 16],
            KernelEvents::EXCEPTION => [
                // A refusal is an answer, not a failure, so it skips the error log.
                ['renderRefusal', 16],
                // After Symfony logs the exception, before it renders an HTML page.
                ['renderError', -64],
            ],
            KernelEvents::RESPONSE => 'forbidCaching',
        ];
    }

    public function rejectCrossSiteWrite(RequestEvent $event): void
    {
        $request = $event->getRequest();

        if (!$event->isMainRequest() || !self::isApi($request) || $request->isMethodSafe()) {
            return;
        }

        // Browsers send Origin with every write, so a request without it does not come from this site.
        if ($request->headers->get('Origin') !== $request->getSchemeAndHttpHost()) {
            throw new ApiProblem(Response::HTTP_FORBIDDEN, 'cross-origin');
        }
    }

    public function renderRefusal(ExceptionEvent $event): void
    {
        $refusal = $event->getThrowable();

        if (!$refusal instanceof Refusal || !self::isApi($event->getRequest())) {
            return;
        }

        $status = match ($refusal->reason) {
            RefusalReason::Invalid => Response::HTTP_UNPROCESSABLE_ENTITY,
            RefusalReason::Conflict => Response::HTTP_CONFLICT,
            RefusalReason::UserGone => Response::HTTP_UNAUTHORIZED,
        };

        $event->setResponse(new JsonResponse(['error' => $refusal->error], $status));
    }

    public function renderError(ExceptionEvent $event): void
    {
        if (!self::isApi($event->getRequest())) {
            return;
        }

        $exception = $event->getThrowable();
        $http = $exception instanceof HttpExceptionInterface ? $exception : null;
        $status = $http?->getStatusCode() ?? Response::HTTP_INTERNAL_SERVER_ERROR;
        $error = match (true) {
            $exception instanceof ApiProblem => $exception->error,
            $status >= Response::HTTP_INTERNAL_SERVER_ERROR => 'server',
            default => self::ERRORS[$status] ?? 'request-refused',
        };

        $event->setResponse(new JsonResponse(['error' => $error], $status, $http?->getHeaders() ?? []));
    }

    public function forbidCaching(ResponseEvent $event): void
    {
        if (self::isApi($event->getRequest())) {
            $event->getResponse()->headers->set('Cache-Control', 'no-store');
        }
    }

    private static function isApi(Request $request): bool
    {
        return str_starts_with($request->getPathInfo(), '/api/');
    }
}
