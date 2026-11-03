<?php

declare(strict_types=1);

namespace App\Site\Presentation\Twig;

use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Twig\Extension\AbstractExtension;
use Twig\Extension\GlobalsInterface;

/**
 * The address search engines know the site by, for canonical links, and whether they may index
 * it at all: staging and development stay closed (section 6.3 of the plan).
 */
final class SiteExtension extends AbstractExtension implements GlobalsInterface
{
    public function __construct(
        #[Autowire(env: 'DEFAULT_URI')]
        private readonly string $siteUrl,
        #[Autowire(env: 'bool:SEO_INDEXING')]
        private readonly bool $indexing,
    ) {
    }

    public function getGlobals(): array
    {
        return ['site_url' => rtrim($this->siteUrl, '/'), 'seo_indexing' => $this->indexing];
    }
}
