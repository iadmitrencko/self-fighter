<?php

declare(strict_types=1);

namespace App\Account\Presentation\Http;

use App\Account\Application\DeleteUser;
use App\Account\Application\ExportUserData;
use App\Account\Application\FindUser;
use App\Account\Application\SignUpGuest;
use App\Account\Application\UserView;
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
 * The user of this browser.
 */
final readonly class MeController
{
    public function __construct(
        private FindUser $findUser,
        private SignUpGuest $signUpGuest,
        private DeleteUser $deleteUser,
        private ExportUserData $exportUserData,
        private DeviceCookie $cookie,
        private RateLimiterFactoryInterface $guestCreationLimiter,
    ) {
    }

    #[Route('/api/v1/me', name: 'api_me', methods: ['GET'])]
    public function show(?UserId $user): JsonResponse
    {
        return Json::response(['user' => $this->describe($user)]);
    }

    // A guest appears with the first write of a browser, so visitors who only look leave nothing behind (§15.1).
    #[Route('/api/v1/me', name: 'api_me_create', methods: ['POST'])]
    public function create(Request $request, ?UserId $user): JsonResponse
    {
        $current = $this->describe($user);

        if (null !== $current) {
            return Json::response(['user' => $current]);
        }

        $limit = $this->guestCreationLimiter->create($request->getClientIp() ?? 'unknown')->consume();

        if (!$limit->isAccepted()) {
            throw ApiProblem::tooManyRequests($limit);
        }

        $guest = ($this->signUpGuest)();
        $response = Json::response(['user' => UserView::of($guest->user)], Response::HTTP_CREATED);
        $this->cookie->issue($response, $guest->token);

        return $response;
    }

    // §15.5: the data of every module goes together with the user.
    #[Route('/api/v1/me', name: 'api_me_delete', methods: ['DELETE'])]
    public function delete(UserId $user): Response
    {
        ($this->deleteUser)($user);

        $response = new Response(null, Response::HTTP_NO_CONTENT);
        $this->cookie->remove($response);

        return $response;
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

    /**
     * @return array{id: string, kind: string, createdAt: string}|null
     */
    private function describe(?UserId $id): ?array
    {
        $user = null === $id ? null : ($this->findUser)($id);

        return null === $user ? null : UserView::of($user);
    }
}
