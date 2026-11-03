<?php

declare(strict_types=1);

namespace App\Content\Presentation\Http;

use App\Content\Domain\Challenge;
use App\Content\Domain\ChallengeRepository;
use App\Content\Domain\Exercise;
use App\Content\Domain\ExerciseRepository;
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
    public function __construct(
        private readonly ExerciseRepository $exercises,
        private readonly PageRepository $pages,
        private readonly ChallengeRepository $challenges,
    ) {
    }

    #[Route('/sitemap.xml', name: 'sitemap', methods: ['GET'], format: 'xml')]
    public function __invoke(): Response
    {
        $challenges = $this->challenges->all();
        $exercises = $this->exercises->all();
        $modes = $this->pages->ofType(PageType::Mode);
        $guides = $this->pages->ofType(PageType::Guide);
        $urls = [
            ['path' => $this->generateUrl('home'), 'updated' => null],
            ['path' => $this->generateUrl('challenges'), 'updated' => self::latest($challenges)],
            ['path' => $this->generateUrl('exercises'), 'updated' => self::latest($exercises)],
            ['path' => $this->generateUrl('modes'), 'updated' => self::latest($modes)],
            ['path' => $this->generateUrl('guides'), 'updated' => self::latest($guides)],
        ];
        $add = function (array $items, string $route) use (&$urls): void {
            foreach ($items as $item) {
                if ($item->indexable()) {
                    $urls[] = ['path' => $this->generateUrl($route, ['slug' => $item->slug()]), 'updated' => $item->updatedAt()];
                }
            }
        };
        $add($challenges, 'challenge');
        $add($exercises, 'exercise');
        $add($modes, 'mode');
        $add($guides, 'guide');
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
     * @param list<Challenge|Exercise|Page> $items
     */
    private static function latest(array $items): ?\DateTimeImmutable
    {
        return [] === $items ? null : max(array_map(static fn ($item): \DateTimeImmutable => $item->updatedAt(), $items));
    }
}
