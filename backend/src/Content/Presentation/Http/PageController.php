<?php

declare(strict_types=1);

namespace App\Content\Presentation\Http;

use App\Content\Domain\PageRepository;
use App\Content\Domain\PageType;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

// The pages about the service, written in Markdown.
final class PageController extends AbstractController
{
    public function __construct(private readonly PageRepository $pages)
    {
    }

    // What happens in the game (§24), so it is the page to read before the first fight.
    #[Route('/about', name: 'about', methods: ['GET'])]
    public function about(): Response
    {
        return $this->service('about');
    }

    // §22: what the site keeps and why. The final policy and the terms come at stage 10 of the plan.
    #[Route('/privacy', name: 'privacy', methods: ['GET'])]
    public function privacy(): Response
    {
        return $this->service('privacy');
    }

    private function service(string $slug): Response
    {
        return $this->render('content/service.html.twig', [
            'page' => $this->pages->find(PageType::Service, $slug) ?? throw $this->createNotFoundException(),
        ]);
    }
}
