<?php

declare(strict_types=1);

namespace App\Content\Presentation\Http;

use App\Content\Domain\ChallengeRepository;
use App\Content\Domain\PageRepository;
use App\Content\Domain\PageType;
use App\Content\Domain\Slug;
use App\Shared\Domain\GameModes;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

// The pages written in Markdown: modes, guides and the pages about the service (§21.2).
final class PageController extends AbstractController
{
    public function __construct(
        private readonly PageRepository $pages,
        private readonly ChallengeRepository $challenges,
    ) {
    }

    #[Route('/modes', name: 'modes', methods: ['GET'])]
    public function modes(): Response
    {
        return $this->render('content/modes.html.twig', ['pages' => $this->pages->ofType(PageType::Mode)]);
    }

    #[Route('/modes/{slug}', name: 'mode', requirements: ['slug' => GameModes::PATTERN], methods: ['GET'])]
    public function mode(string $slug): Response
    {
        return $this->render('content/mode.html.twig', [
            'page' => $this->pages->find(PageType::Mode, $slug) ?? throw $this->createNotFoundException(),
            'challenges' => $this->challenges->ofMode($slug),
        ]);
    }

    #[Route('/guides', name: 'guides', methods: ['GET'])]
    public function guides(): Response
    {
        return $this->render('content/guides.html.twig', ['pages' => $this->pages->ofType(PageType::Guide)]);
    }

    #[Route('/guides/{slug}', name: 'guide', requirements: ['slug' => Slug::PATTERN], methods: ['GET'])]
    public function guide(string $slug): Response
    {
        return $this->render('content/guide.html.twig', [
            'page' => $this->pages->find(PageType::Guide, $slug) ?? throw $this->createNotFoundException(),
        ]);
    }

    // The privacy policy and the terms join it at stage 10 of the plan.
    #[Route('/about', name: 'about', methods: ['GET'])]
    public function about(): Response
    {
        return $this->render('content/service.html.twig', [
            'page' => $this->pages->find(PageType::Service, 'about') ?? throw $this->createNotFoundException(),
        ]);
    }
}
