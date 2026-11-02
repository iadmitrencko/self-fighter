<?php

declare(strict_types=1);

namespace App\Api;

use App\Entity\CustomExercise;
use App\Entity\ExerciseDetails;
use App\Entity\User;
use App\Repository\CustomExerciseRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Clock\ClockInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Uid\Uuid;

/**
 * Custom exercises (§5.2). The browser creates the id, so a repeated request does not add a copy.
 */
final readonly class ExerciseController
{
    private const int MAX_BYTES = 4 * 1024;

    public function __construct(
        private CustomExerciseRepository $exercises,
        private UserWrites $writes,
        private EntityManagerInterface $entityManager,
        private ClockInterface $clock,
    ) {
    }

    #[Route('/api/v1/exercises/{id}', name: 'api_exercise_save', methods: ['PUT'], requirements: ['id' => Requirement::UUID_V7])]
    public function save(string $id, Request $request, #[CurrentUser] User $user): JsonResponse
    {
        $details = self::details(JsonBody::read($request, self::MAX_BYTES)->data)
            ?? throw new ApiProblem(Response::HTTP_UNPROCESSABLE_ENTITY, 'invalid-exercise');
        $exerciseId = Uuid::fromString($id);

        return $this->writes->run($user, function () use ($exerciseId, $user, $details): JsonResponse {
            $exercise = $this->exercises->find($exerciseId);

            if (null !== $exercise && !$exercise->belongsTo($user)) {
                throw new ApiProblem(Response::HTTP_CONFLICT, 'conflict');
            }
            if ($this->exercises->isNameTaken($user, $details->nameKey, $exerciseId)) {
                throw new ApiProblem(Response::HTTP_CONFLICT, 'exercise-name-taken');
            }

            if (null === $exercise) {
                $exercise = new CustomExercise($exerciseId, $user, $details, $this->clock->now());
                $this->entityManager->persist($exercise);

                return Payload::json(Payload::exercise($exercise), Response::HTTP_CREATED);
            }

            $exercise->change($details, $this->clock->now());

            return Payload::json(Payload::exercise($exercise));
        });
    }

    // Saved attempts keep their own copy of the name, so deleting an exercise does not touch the history (§5.3).
    #[Route('/api/v1/exercises/{id}', name: 'api_exercise_delete', methods: ['DELETE'], requirements: ['id' => Requirement::UUID_V7])]
    public function delete(string $id, #[CurrentUser] User $user): Response
    {
        $this->writes->run($user, function () use ($id, $user): void {
            $exercise = $this->exercises->findOneForUser($user, Uuid::fromString($id));

            if (null !== $exercise) {
                $this->entityManager->remove($exercise);
            }
        });

        return new Response(null, Response::HTTP_NO_CONTENT);
    }

    private static function details(mixed $data): ?ExerciseDetails
    {
        $fields = $data instanceof \stdClass ? get_object_vars($data) : [];
        $name = $fields['name'] ?? null;
        $description = $fields['description'] ?? null;

        return 2 === \count($fields) && \is_string($name) && \is_string($description)
            ? ExerciseDetails::tryFrom($name, $description)
            : null;
    }
}
