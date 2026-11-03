<?php

declare(strict_types=1);

namespace App\Content\Presentation\Http;

use App\Content\Domain\Challenge;
use App\Content\Domain\ChallengeRepository;
use App\Content\Domain\ExerciseRepository;
use App\Content\Domain\Slug;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

// The catalog of ready-made challenges and the page of each (§21.3 of the specification).
final class ChallengeController extends AbstractController
{
    public function __construct(
        private readonly ChallengeRepository $challenges,
        private readonly ExerciseRepository $exercises,
    ) {
    }

    // A group for each exercise, and one for the challenges of several exercises at the end.
    #[Route('/challenges', name: 'challenges', methods: ['GET'])]
    public function index(): Response
    {
        $byExercise = [];

        foreach ($this->challenges->all() as $challenge) {
            $exercises = $challenge->exercises();
            $byExercise[1 === \count($exercises) ? $exercises[0] : ''][] = $challenge;
        }
        $groups = [];

        foreach ($this->exercises->all() as $exercise) {
            if (isset($byExercise[$exercise->slug()])) {
                $groups[] = ['exercise' => $exercise, 'challenges' => $byExercise[$exercise->slug()]];
            }
        }
        if (isset($byExercise[''])) {
            $groups[] = ['exercise' => null, 'challenges' => $byExercise['']];
        }

        return $this->render('content/challenges.html.twig', ['groups' => $groups]);
    }

    #[Route('/challenges/{slug}', name: 'challenge', requirements: ['slug' => Slug::PATTERN], methods: ['GET'])]
    public function show(string $slug): Response
    {
        $challenges = [];

        foreach ($this->challenges->all() as $challenge) {
            $challenges[$challenge->slug()] = $challenge;
        }
        $challenge = $challenges[$slug] ?? throw $this->createNotFoundException();

        return $this->render('content/challenge.html.twig', [
            'challenge' => $challenge,
            'exercises' => array_values(array_filter(array_map($this->exercises->find(...), $challenge->exercises()))),
            'easier' => $challenges[$challenge->easier() ?? ''] ?? null,
            'harder' => $challenges[$challenge->harder() ?? ''] ?? null,
            'related' => array_values(array_filter(array_map(
                static fn (string $related): ?Challenge => $challenges[$related] ?? null,
                $challenge->related(),
            ))),
        ]);
    }
}
