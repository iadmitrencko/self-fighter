<?php

declare(strict_types=1);

namespace App\Site\Presentation\Http;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;

/**
 * §24.1: everything is made for the game now. The ready-made challenges, the pages of the modes
 * and of the exercises, the workouts of /workout and the modes of a fight (§6) are gone, and their
 * old addresses lead into the game.
 */
final class RemovedSectionsController extends AbstractController
{
    // The modes a fight had before it was put together freely.
    private const string OLD_MODES = 'target|random-opponent|opponent-levels|ladder';

    #[Route('/challenges', name: 'removed_challenges', methods: ['GET'])]
    #[Route('/challenges/{slug}', name: 'removed_challenge', requirements: ['slug' => Requirement::ASCII_SLUG], methods: ['GET'])]
    #[Route('/workout/challenge/{slug}', name: 'removed_workout_challenge', requirements: ['slug' => Requirement::ASCII_SLUG], methods: ['GET'])]
    #[Route('/modes', name: 'removed_modes', methods: ['GET'])]
    #[Route('/modes/{slug}', name: 'removed_mode', requirements: ['slug' => Requirement::ASCII_SLUG], methods: ['GET'])]
    #[Route('/exercises', name: 'removed_exercises', methods: ['GET'])]
    #[Route('/exercises/{slug}', name: 'removed_exercise', requirements: ['slug' => Requirement::ASCII_SLUG], methods: ['GET'])]
    public function __invoke(): RedirectResponse
    {
        return $this->redirectToRoute('kozak');
    }

    // A screen of /workout or of a mode of the fights opens the same screen of the fights of the game,
    // the setup of a mode the hall where a fight is put together. The query stays, so a sign-in with
    // Google that set out from there still tells how it went.
    #[Route('/workout', name: 'removed_workout', defaults: ['screen' => 'kozak_fight'], methods: ['GET'])]
    #[Route('/workout/setup/{mode}', name: 'removed_workout_setup', requirements: ['mode' => self::OLD_MODES], defaults: ['screen' => 'kozak_fight'], methods: ['GET'])]
    #[Route('/game/fight/setup/{mode}', name: 'removed_fight_setup', requirements: ['mode' => self::OLD_MODES], defaults: ['screen' => 'kozak_fight'], methods: ['GET'])]
    #[Route('/workout/fight', name: 'removed_workout_fight', defaults: ['screen' => 'kozak_fight'], methods: ['GET'])]
    #[Route('/workout/result/{id}', name: 'removed_workout_result', requirements: ['id' => Requirement::UUID_V7], defaults: ['screen' => 'kozak_fight_result'], methods: ['GET'])]
    #[Route('/workout/history', name: 'removed_workout_history', defaults: ['screen' => 'kozak_history'], methods: ['GET'])]
    #[Route('/workout/account', name: 'removed_workout_account', defaults: ['screen' => 'kozak_settings'], methods: ['GET'])]
    public function workout(Request $request, string $screen): RedirectResponse
    {
        /** @var array<string, string> $route */
        $route = $request->attributes->get('_route_params', []);
        unset($route['screen'], $route['mode']);

        // The parameters of the route come last: the query cannot replace them.
        return $this->redirectToRoute($screen, [...$request->query->all(), ...$route]);
    }
}
