<?php

declare(strict_types=1);

namespace App\Site\Presentation\Http;

use App\Shared\Application\GameContent;
use App\Shared\Application\SignInMethods;
use App\Shared\Domain\GameJourney;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;

/**
 * §24: the section «Гра», the cossack game, where every workout happens. React takes over in the
 * browser and reaches the data through /api. Every screen has its own route here, so an unknown
 * address is a real 404 (section 3.4 of the plan).
 */
final class KozakShellController extends AbstractController
{
    public function __construct(
        private readonly GameContent $content,
        private readonly SignInMethods $signIn,
    ) {
    }

    #[Route('/game', name: 'kozak', methods: ['GET'])]
    #[Route('/game/ranks', name: 'kozak_ranks', methods: ['GET'])]
    #[Route('/game/history', name: 'kozak_history', methods: ['GET'])]
    #[Route('/game/settings', name: 'kozak_settings', methods: ['GET'])]
    #[Route('/game/fight', name: 'kozak_fight', methods: ['GET'])]
    #[Route('/game/fight/battle', name: 'kozak_fight_battle', methods: ['GET'])]
    #[Route('/game/fight/result/{id}', name: 'kozak_fight_result', requirements: ['id' => Requirement::UUID_V7], methods: ['GET'])]
    #[Route('/game/journey', name: 'kozak_journey', methods: ['GET'])]
    #[Route('/game/journey/battle', name: 'kozak_journey_battle', methods: ['GET'])]
    #[Route('/game/journey/result/{id}', name: 'kozak_journey_result', requirements: ['id' => Requirement::UUID_V7], methods: ['GET'])]
    #[Route('/game/journey/{campaign}', name: 'kozak_campaign', requirements: ['campaign' => GameJourney::CAMPAIGNS], methods: ['GET'])]
    #[Route('/game/journey/{campaign}/{stage}', name: 'kozak_stage', requirements: ['campaign' => GameJourney::CAMPAIGNS, 'stage' => GameJourney::NUMBER], methods: ['GET'])]
    #[Route('/game/journey/{campaign}/{stage}/{level}', name: 'kozak_level', requirements: ['campaign' => GameJourney::CAMPAIGNS, 'stage' => GameJourney::NUMBER, 'level' => GameJourney::NUMBER], methods: ['GET'])]
    public function __invoke(): Response
    {
        return $this->render('kozak/shell.html.twig', ['game' => [
            'exercises' => $this->content->exercises(),
            'signIn' => $this->signIn->available(),
        ]]);
    }
}
