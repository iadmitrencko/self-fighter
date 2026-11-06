<?php

declare(strict_types=1);

namespace App\Site\Presentation\Http;

use App\Shared\Application\GameContent;
use App\Shared\Application\SignInMethods;
use App\Shared\Domain\GameModes;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;

/**
 * The page of the game: React takes over in the browser and reaches the data through /api.
 * Every screen has its own route here, so an unknown address is a real 404 (section 3.4 of the plan).
 */
final class GameShellController extends AbstractController
{
    public function __construct(
        private readonly GameContent $content,
        private readonly SignInMethods $signIn,
    ) {
    }

    #[Route('/workout', name: 'workout', methods: ['GET'])]
    #[Route('/workout/setup/{mode}', name: 'workout_setup', requirements: ['mode' => GameModes::PATTERN], methods: ['GET'])]
    #[Route('/workout/fight', name: 'workout_fight', methods: ['GET'])]
    #[Route('/workout/result/{id}', name: 'workout_result', requirements: ['id' => Requirement::UUID_V7], methods: ['GET'])]
    #[Route('/workout/history', name: 'workout_history', methods: ['GET'])]
    #[Route('/workout/account', name: 'workout_account', methods: ['GET'])]
    public function __invoke(): Response
    {
        return $this->render('workout/shell.html.twig', ['game' => [
            'exercises' => $this->content->exercises(),
            'signIn' => $this->signIn->available(),
        ]]);
    }

    // §21.3: the settings of the challenge open filled in, and the player may change them.
    #[Route('/workout/challenge/{slug}', name: 'workout_challenge', requirements: ['slug' => Requirement::ASCII_SLUG], methods: ['GET'])]
    public function challenge(string $slug): Response
    {
        $challenge = $this->content->challenge($slug) ?? throw $this->createNotFoundException();

        return $this->render('workout/shell.html.twig', ['game' => [
            'exercises' => $this->content->exercises(),
            'signIn' => $this->signIn->available(),
            'challenge' => $challenge,
        ]]);
    }
}
