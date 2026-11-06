<?php

declare(strict_types=1);

namespace App\Account\Presentation\Http;

use App\Account\Application\DeleteUser;
use App\Account\Application\DescribeBrowser;
use App\Account\Application\ExportUserData;
use App\Account\Application\MergeGuest;
use App\Account\Application\SignOut;
use App\Account\Application\SignUpGuest;
use App\Account\Application\UserView;
use App\Account\Domain\Device;
use App\Shared\Domain\UserId;
use App\Shared\Presentation\Http\ApiProblem;
use App\Shared\Presentation\Http\Json;
use Symfony\Component\HttpFoundation\HeaderUtils;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\Routing\Attribute\Route;

/**
 * The user of this browser and the guest it keeps while an account is signed in.
 */
final readonly class MeController
{
    public function __construct(
        private DescribeBrowser $describeBrowser,
        private SignUpGuest $signUpGuest,
        private SignOut $signOut,
        private MergeGuest $mergeGuest,
        private DeleteUser $deleteUser,
        private ExportUserData $exportUserData,
        private DeviceCookie $cookie,
        private RateLimiterFactoryInterface $guestCreationLimiter,
    ) {
    }

    #[Route('/api/v1/me', name: 'api_me', methods: ['GET'])]
    public function show(?Device $device): JsonResponse
    {
        return Json::response(($this->describeBrowser)($device));
    }

    // A guest appears with the first write of a browser, so visitors who only look leave nothing behind (§15.1).
    #[Route('/api/v1/me', name: 'api_me_create', methods: ['POST'])]
    public function create(Request $request, ?Device $device): JsonResponse
    {
        $current = ($this->describeBrowser)($device);

        if (null !== $current['user']) {
            return Json::response($current);
        }

        $limit = $this->guestCreationLimiter->create($request->getClientIp() ?? 'unknown')->consume();

        if (!$limit->isAccepted()) {
            throw ApiProblem::tooManyRequests($limit);
        }

        $guest = ($this->signUpGuest)();
        $response = Json::response(['user' => UserView::of($guest->user, false), 'guest' => null], Response::HTTP_CREATED);
        $this->cookie->issue($response, $guest->token);

        return $response;
    }

    // §15.5: the data of every module goes together with the user.
    #[Route('/api/v1/me', name: 'api_me_delete', methods: ['DELETE'])]
    public function delete(UserId $user, Device $device): Response
    {
        ($this->deleteUser)($user);

        $response = new Response(null, Response::HTTP_NO_CONTENT);

        // A browser that kept its guest goes back to it with the same cookie.
        if ($device->owner()->equals($user)) {
            $this->cookie->remove($response);
        }

        return $response;
    }

    // §23.2: the browser goes back to its guest or to no user, and the data of the account is out of reach.
    #[Route('/api/v1/me/logout', name: 'api_me_logout', methods: ['POST'])]
    public function logout(Device $device): JsonResponse
    {
        $token = ($this->signOut)($device);
        $response = Json::response(($this->describeBrowser)(null === $token ? null : $device));

        if (null === $token) {
            $this->cookie->remove($response);
        } else {
            $this->cookie->issue($response, $token);
        }

        return $response;
    }

    // §23.3: the guest this browser kept joins the account.
    #[Route('/api/v1/me/merge', name: 'api_me_merge', methods: ['POST'])]
    public function merge(Device $device): JsonResponse
    {
        ($this->mergeGuest)($device);

        return Json::response(($this->describeBrowser)($device));
    }

    #[Route('/api/v1/me/export', name: 'api_me_export', methods: ['GET'])]
    public function export(UserId $user): JsonResponse
    {
        $response = Json::response(($this->exportUserData)($user));
        $response->headers->set('Content-Disposition', HeaderUtils::makeDisposition(
            HeaderUtils::DISPOSITION_ATTACHMENT,
            'self-fighter-data.json',
        ));

        return $response;
    }
}
