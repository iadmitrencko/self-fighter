<?php

declare(strict_types=1);

namespace App\Shared\Presentation\Http;

use App\Shared\Domain\UserId;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Controller\ValueResolverInterface;
use Symfony\Component\HttpKernel\ControllerMetadata\ArgumentMetadata;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

/**
 * Gives a controller argument of type UserId the user of the request. The game needs an
 * account (§23.1), so a request without one is refused.
 */
final readonly class UserIdResolver implements ValueResolverInterface
{
    public function __construct(private TokenStorageInterface $tokens)
    {
    }

    /**
     * @return iterable<UserId>
     */
    public function resolve(Request $request, ArgumentMetadata $argument): iterable
    {
        if (UserId::class !== $argument->getType()) {
            return [];
        }

        $user = $this->tokens->getToken()?->getUser();

        if ($user instanceof SecurityUser) {
            return [$user->id];
        }

        throw new ApiProblem(Response::HTTP_UNAUTHORIZED, 'unauthorized');
    }
}
