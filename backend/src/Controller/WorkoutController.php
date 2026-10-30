<?php

declare(strict_types=1);

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class WorkoutController extends AbstractController
{
    #[Route('/workout', name: 'workout', methods: ['GET'])]
    public function __invoke(): Response
    {
        return $this->render('workout/shell.html.twig');
    }
}
