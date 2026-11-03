<?php

declare(strict_types=1);

namespace App\Content\Application;

use App\Content\Domain\Challenge;
use App\Content\Domain\Exercise;
use App\Content\Domain\Page;

// Everything the site publishes, as the content files describe it.
final readonly class Content
{
    /**
     * @param list<Exercise>  $exercises
     * @param list<Page>      $pages
     * @param list<Challenge> $challenges
     */
    public function __construct(
        public array $exercises,
        public array $pages,
        public array $challenges,
    ) {
    }
}
