<?php

declare(strict_types=1);

namespace App\Workout\Presentation\Http;

use App\Shared\Domain\UserId;
use App\Shared\Presentation\Http\ApiProblem;
use App\Shared\Presentation\Http\Json;
use App\Shared\Presentation\Http\JsonBody;
use App\Workout\Application\ExerciseView;
use App\Workout\Application\ListExercises;
use App\Workout\Application\RemoveExercise;
use App\Workout\Application\SaveExercise;
use App\Workout\Domain\ExerciseId;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;

/**
 * Custom exercises (§5.2).
 */
final readonly class ExerciseController
{
    private const int MAX_BYTES = 4 * 1024;

    public function __construct(
        private ListExercises $listExercises,
        private SaveExercise $saveExercise,
        private RemoveExercise $removeExercise,
    ) {
    }

    #[Route('/api/v1/exercises', name: 'api_exercises', methods: ['GET'])]
    public function list(UserId $user): JsonResponse
    {
        return Json::response(($this->listExercises)($user));
    }

    #[Route('/api/v1/exercises/{id}', name: 'api_exercise_save', methods: ['PUT'], requirements: ['id' => Requirement::UUID_V7])]
    public function save(string $id, Request $request, UserId $user): JsonResponse
    {
        $fields = JsonBody::fields($request, self::MAX_BYTES) ?? [];
        $name = $fields['name'] ?? null;
        $description = $fields['description'] ?? null;

        if (2 !== \count($fields) || !\is_string($name) || !\is_string($description)) {
            throw new ApiProblem(Response::HTTP_UNPROCESSABLE_ENTITY, 'invalid-exercise');
        }

        $saved = ($this->saveExercise)($user, ExerciseId::fromString($id), $name, $description);

        return Json::response(ExerciseView::of($saved->exercise), $saved->created ? Response::HTTP_CREATED : Response::HTTP_OK);
    }

    #[Route('/api/v1/exercises/{id}', name: 'api_exercise_delete', methods: ['DELETE'], requirements: ['id' => Requirement::UUID_V7])]
    public function delete(string $id, UserId $user): Response
    {
        ($this->removeExercise)($user, ExerciseId::fromString($id));

        return new Response(null, Response::HTTP_NO_CONTENT);
    }
}
