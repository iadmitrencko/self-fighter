<?php

declare(strict_types=1);

namespace App\Content\Application;

use App\Content\Domain\Exercise;
use App\Content\Domain\Page;

// Everything the site publishes, as the content files describe it: the catalog of exercises of the
// game and the pages written in Markdown.
final readonly class Content
{
    /**
     * @param list<Exercise> $exercises
     * @param list<Page>     $pages
     */
    public function __construct(
        public array $exercises,
        public array $pages,
    ) {
    }
}
