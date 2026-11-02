<?php

declare(strict_types=1);

namespace App\Api;

use App\Account\DeviceCookie;
use App\Account\Guests;
use App\Entity\Attempt;
use App\Entity\User;
use App\Repository\AttemptRepository;
use App\Repository\CustomExerciseRepository;
use App\Repository\UserSettingRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Clock\ClockInterface;
use Symfony\Component\HttpFoundation\HeaderUtils;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * The user of this browser and everything the game needs to start: custom exercises and settings.
 */
final readonly class MeController
{
    public function __construct(
        private Guests $guests,
        private DeviceCookie $cookie,
        private UserWrites $writes,
        private EntityManagerInterface $entityManager,
        private CustomExerciseRepository $exercises,
        private UserSettingRepository $settings,
        private AttemptRepository $attempts,
        private RateLimiterFactoryInterface $guestCreationLimiter,
        private ClockInterface $clock,
    ) {
    }

    #[Route('/api/v1/me', name: 'api_me', methods: ['GET'])]
    public function show(#[CurrentUser] ?User $user): JsonResponse
    {
        return Payload::json($this->describe($user));
    }

    // A guest appears with the first write of a browser, so visitors who only look leave nothing behind (§15.1).
    #[Route('/api/v1/me', name: 'api_me_create', methods: ['POST'])]
    public function create(Request $request, #[CurrentUser] ?User $user): JsonResponse
    {
        if (null !== $user) {
            return Payload::json($this->describe($user));
        }

        $limit = $this->guestCreationLimiter->create($request->getClientIp() ?? 'unknown')->consume();

        if (!$limit->isAccepted()) {
            throw ApiProblem::tooManyRequests($limit);
        }

        [$user, $token] = $this->guests->create();
        $response = Payload::json($this->describe($user), Response::HTTP_CREATED);
        $this->cookie->issue($response, $token);

        return $response;
    }

    // The database removes the devices, attempts, exercises and settings together with the user (§15.5).
    #[Route('/api/v1/me', name: 'api_me_delete', methods: ['DELETE'])]
    public function delete(#[CurrentUser] User $user): Response
    {
        $this->writes->run($user, fn () => $this->entityManager->remove($user));

        $response = new Response(null, Response::HTTP_NO_CONTENT);
        $this->cookie->remove($response);

        return $response;
    }

    #[Route('/api/v1/me/export', name: 'api_me_export', methods: ['GET'])]
    public function export(#[CurrentUser] User $user): JsonResponse
    {
        $response = Payload::json([
            'exportedAt' => Instant::format($this->clock->now()),
            ...$this->describe($user),
            'attempts' => array_map(
                static fn (Attempt $attempt): array => $attempt->getDocument(),
                $this->attempts->findAllForUser($user),
            ),
        ]);
        $response->headers->set('Content-Disposition', HeaderUtils::makeDisposition(
            HeaderUtils::DISPOSITION_ATTACHMENT,
            'self-fighter-data.json',
        ));

        return $response;
    }

    /**
     * @return array{user: array<string, string>|null, exercises: list<array<string, string>>, settings: \stdClass}
     */
    private function describe(?User $user): array
    {
        if (null === $user) {
            return ['user' => null, 'exercises' => [], 'settings' => new \stdClass()];
        }

        return [
            'user' => Payload::user($user),
            'exercises' => array_map(Payload::exercise(...), $this->exercises->findByUser($user)),
            'settings' => Payload::settings($this->settings->findByUser($user)),
        ];
    }
}
