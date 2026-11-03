<?php

declare(strict_types=1);

namespace App\Site\Presentation\Http;

use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Production opens the site to every crawler, AI search included; any other environment closes
 * it (section 6.3 of the plan). The game stays open: a crawler must reach /workout to see its
 * noindex.
 */
final readonly class RobotsController
{
    public function __construct(
        #[Autowire(env: 'DEFAULT_URI')]
        private string $siteUrl,
        #[Autowire(env: 'bool:SEO_INDEXING')]
        private bool $indexing,
    ) {
    }

    #[Route('/robots.txt', name: 'robots', methods: ['GET'], format: 'txt')]
    public function __invoke(): Response
    {
        $rules = $this->indexing
            ? "User-agent: *\nDisallow: /api/\nDisallow: /connect/\nDisallow: /logout\n\nSitemap: ".rtrim($this->siteUrl, '/')."/sitemap.xml\n"
            : "User-agent: *\nDisallow: /\n";

        return new Response($rules, Response::HTTP_OK, ['Content-Type' => 'text/plain; charset=UTF-8']);
    }
}
