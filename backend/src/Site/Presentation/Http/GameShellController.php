<?php

declare(strict_types=1);

namespace App\Site\Presentation\Http;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

// The page of the game: React takes over in the browser and reaches the data through /api.
final class GameShellController extends AbstractController
{
    #[Route('/workout', name: 'workout', methods: ['GET'])]
    public function __invoke(): Response
    {
        return $this->render('workout/shell.html.twig');
    }
}
