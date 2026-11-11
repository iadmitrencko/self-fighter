<?php

declare(strict_types=1);

namespace App\Content\Presentation\Http;

use App\Content\Domain\Page;
use App\Content\Domain\PageRepository;
use App\Content\Domain\PageType;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Only the pages search engines may index, with the date their content last changed (section 6.3
 * of the plan). A hub changes with the pages it lists.
 */
final class SitemapController extends AbstractController
{
    public function __construct(private readonly PageRepository $pages)
    {
    }

    #[Route('/sitemap.xml', name: 'sitemap', methods: ['GET'], format: 'xml')]
    public function __invoke(): Response
    {
        $guides = $this->pages->ofType(PageType::Guide);
        $urls = [
            ['path' => $this->generateUrl('home'), 'updated' => null],
            ['path' => $this->generateUrl('guides'), 'updated' => self::latest($guides)],
        ];

        foreach ($guides as $guide) {
            if ($guide->indexable()) {
                $urls[] = ['path' => $this->generateUrl('guide', ['slug' => $guide->slug()]), 'updated' => $guide->updatedAt()];
            }
        }
        // The pages about the service are named after their routes.
        foreach (['about', 'privacy'] as $slug) {
            $page = $this->pages->find(PageType::Service, $slug);

            if (null !== $page && $page->indexable()) {
                $urls[] = ['path' => $this->generateUrl($slug), 'updated' => $page->updatedAt()];
            }
        }

        $response = $this->render('content/sitemap.xml.twig', ['urls' => $urls]);
        $response->headers->set('Content-Type', 'application/xml; charset=UTF-8');

        return $response;
    }

    /**
     * @param list<Page> $pages
     */
    private static function latest(array $pages): ?\DateTimeImmutable
    {
        return [] === $pages ? null : max(array_map(static fn (Page $page): \DateTimeImmutable => $page->updatedAt(), $pages));
    }
}
