<?php

declare(strict_types=1);

namespace App\Account\Presentation\Http;

use App\Account\Application\DeleteUser;
use App\Account\Application\DescribeBrowser;
use App\Account\Application\RenameCossack;
use App\Account\Application\SignOut;
use App\Account\Domain\Device;
use App\Shared\Domain\UserId;
use App\Shared\Presentation\Http\ApiProblem;
use App\Shared\Presentation\Http\Json;
use App\Shared\Presentation\Http\JsonBody;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * The account signed in on this browser (§23.2). Only signing in with Google creates one.
 */
final readonly class MeController
{
    private const int MAX_BYTES = 1024;

    public function __construct(
        private DescribeBrowser $describeBrowser,
        private SignOut $signOut,
        private RenameCossack $renameCossack,
        private DeleteUser $deleteUser,
        private DeviceCookie $cookie,
    ) {
    }

    // A browser without an account gets no user, and the game asks to sign in (§23.1).
    #[Route('/api/v1/me', name: 'api_me', methods: ['GET'])]
    public function show(?Device $device): JsonResponse
    {
        return Json::response(($this->describeBrowser)($device));
    }

    // §24.11: the name the player gives the cossack; null or an empty one leaves the name Google gave.
    #[Route('/api/v1/me', name: 'api_me_update', methods: ['PATCH'])]
    public function update(Request $request, UserId $user, Device $device): JsonResponse
    {
        $fields = JsonBody::fields($request, self::MAX_BYTES) ?? [];
        $nickname = $fields['nickname'] ?? null;

        if (1 !== \count($fields) || !\array_key_exists('nickname', $fields) || (null !== $nickname && !\is_string($nickname))) {
            throw new ApiProblem(Response::HTTP_UNPROCESSABLE_ENTITY, 'invalid-name');
        }
        ($this->renameCossack)($user, $nickname);

        return Json::response(($this->describeBrowser)($device));
    }

    // §15.5: the data of every module goes together with the account, and the browser forgets it.
    #[Route('/api/v1/me', name: 'api_me_delete', methods: ['DELETE'])]
    public function delete(UserId $user): Response
    {
        ($this->deleteUser)($user);

        $response = new Response(null, Response::HTTP_NO_CONTENT);
        $this->cookie->remove($response);

        return $response;
    }

    // §23.2: the browser forgets the account, and its data is out of reach here until the next sign-in.
    #[Route('/api/v1/me/logout', name: 'api_me_logout', methods: ['POST'])]
    public function logout(Device $device): Response
    {
        ($this->signOut)($device);

        $response = new Response(null, Response::HTTP_NO_CONTENT);
        $this->cookie->remove($response);

        return $response;
    }
}
