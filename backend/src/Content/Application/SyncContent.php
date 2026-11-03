<?php

declare(strict_types=1);

namespace App\Content\Application;

use App\Content\Domain\ChallengeRepository;
use App\Content\Domain\ExerciseRepository;
use App\Content\Domain\PageRepository;
use App\Shared\Application\Transaction;

/**
 * Replaces the content in the database with the content of the files, in one transaction,
 * so the site never shows half of a release (section 3.5 of the plan).
 */
final readonly class SyncContent
{
    public function __construct(
        private ContentSource $source,
        private ContentRules $rules,
        private ExerciseRepository $exercises,
        private PageRepository $pages,
        private ChallengeRepository $challenges,
        private Transaction $transaction,
    ) {
    }

    /**
     * @throws InvalidContent
     */
    public function __invoke(): Content
    {
        $content = $this->source->read();
        $problems = $this->rules->problems($content);

        if ([] !== $problems) {
            throw new InvalidContent($problems);
        }

        $this->transaction->run(function () use ($content): void {
            $this->exercises->replaceAll($content->exercises);
            $this->pages->replaceAll($content->pages);
            $this->challenges->replaceAll($content->challenges);
        });

        return $content;
    }
}
