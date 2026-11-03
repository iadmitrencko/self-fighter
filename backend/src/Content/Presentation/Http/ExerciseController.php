<?php

declare(strict_types=1);

namespace App\Content\Presentation\Http;

use App\Content\Domain\ChallengeRepository;
use App\Content\Domain\ExerciseRepository;
use App\Content\Domain\Slug;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

// Technique, mistakes and the challenges of each exercise (§21.2 of the specification).
final class ExerciseController extends AbstractController
{
    public function __construct(
        private readonly ExerciseRepository $exercises,
        private readonly ChallengeRepository $challenges,
    ) {
    }

    #[Route('/exercises', name: 'exercises', methods: ['GET'])]
    public function index(): Response
    {
        return $this->render('content/exercises.html.twig', ['exercises' => $this->exercises->all()]);
    }

    #[Route('/exercises/{slug}', name: 'exercise', requirements: ['slug' => Slug::PATTERN], methods: ['GET'])]
    public function show(string $slug): Response
    {
        $exercise = $this->exercises->find($slug) ?? throw $this->createNotFoundException();

        return $this->render('content/exercise.html.twig', [
            'exercise' => $exercise,
            'challenges' => $this->challenges->withExercise($exercise->slug()),
        ]);
    }
}
