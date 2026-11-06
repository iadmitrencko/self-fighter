<?php

declare(strict_types=1);

namespace App\Account\Presentation\Http;

use App\Account\Domain\Device;
use App\Shared\Presentation\Http\ApiProblem;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Controller\ValueResolverInterface;
use Symfony\Component\HttpKernel\ControllerMetadata\ArgumentMetadata;

/**
 * Gives a controller argument of type Device the browser of the request. A nullable argument
 * receives null when the browser has no device cookie yet.
 */
final readonly class DeviceResolver implements ValueResolverInterface
{
    /**
     * @return iterable<Device|null>
     */
    public function resolve(Request $request, ArgumentMetadata $argument): iterable
    {
        if (Device::class !== $argument->getType()) {
            return [];
        }

        $device = DeviceCookieRenewal::deviceOf($request);

        if (null !== $device || $argument->isNullable()) {
            return [$device];
        }

        throw new ApiProblem(Response::HTTP_UNAUTHORIZED, 'unauthorized');
    }
}
