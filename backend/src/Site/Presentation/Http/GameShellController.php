<?php

declare(strict_types=1);

namespace App\Site\Presentation\Http;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Contracts\Translation\TranslatorInterface;

/**
 * The page of the game: React takes over in the browser and reaches the data through /api.
 * Every screen has its own route here, so an unknown address is a real 404 (section 3.4 of the plan).
 */
final class GameShellController extends AbstractController
{
    // The ready-made exercises of §5.1. Stage 7 moves them into the content of the site.
    private const array EXERCISES = ['push-ups', 'squats', 'pull-ups'];

    public function __construct(private readonly TranslatorInterface $translator)
    {
    }

    #[Route('/workout', name: 'workout', methods: ['GET'])]
    #[Route('/workout/setup/{mode}', name: 'workout_setup', requirements: ['mode' => 'target|random-opponent|opponent-levels|ladder'], methods: ['GET'])]
    #[Route('/workout/fight', name: 'workout_fight', methods: ['GET'])]
    #[Route('/workout/result/{id}', name: 'workout_result', requirements: ['id' => Requirement::UUID_V7], methods: ['GET'])]
    #[Route('/workout/history', name: 'workout_history', methods: ['GET'])]
    #[Route('/workout/account', name: 'workout_account', methods: ['GET'])]
    public function __invoke(): Response
    {
        $exercises = array_map(
            fn (string $id): array => ['id' => $id, 'name' => $this->translator->trans('exercise.'.$id)],
            self::EXERCISES,
        );

        return $this->render('workout/shell.html.twig', ['game' => ['exercises' => $exercises]]);
    }
}
