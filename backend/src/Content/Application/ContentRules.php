<?php

declare(strict_types=1);

namespace App\Content\Application;

use App\Content\Domain\TextSimilarity;

/**
 * What the content must satisfy before it reaches the site (section 6.3 of the plan). The texts of
 * drafts count too, so a near-copy shows up before anyone reviews it.
 */
final readonly class ContentRules
{
    /**
     * @return list<string>
     */
    public function problems(Content $content): array
    {
        return [
            ...$this->repeatedExercises($content),
            ...$this->repeatedFields($content),
            ...$this->similarTexts($content),
        ];
    }

    // Attempts know an exercise by its slug, so the catalog names each one once.
    /**
     * @return list<string>
     */
    private function repeatedExercises(Content $content): array
    {
        $slugs = array_map(static fn ($exercise): string => $exercise->slug(), $content->exercises);
        $problems = [];

        foreach (array_unique(array_diff_assoc($slugs, array_unique($slugs))) as $slug) {
            $problems[] = \sprintf('Exercise %s appears more than once.', $slug);
        }

        return $problems;
    }

    // Every page has a title and a description of its own (section 6.3 of the plan).
    /**
     * @return list<string>
     */
    private function repeatedFields(Content $content): array
    {
        $problems = [];

        foreach (['title', 'description'] as $field) {
            $owners = [];

            foreach ($content->pages as $page) {
                $name = \sprintf('%s page %s', $page->type()->value, $page->slug());
                $value = $page->article()->{$field};

                if (isset($owners[$value])) {
                    $problems[] = \sprintf('%s has the same %s as %s.', ucfirst($name), $field, $owners[$value]);
                }
                $owners[$value] ??= $name;
            }
        }

        return $problems;
    }

    /**
     * @return list<string>
     */
    private function similarTexts(Content $content): array
    {
        $fingerprints = [];

        foreach ($content->pages as $page) {
            $fingerprints[\sprintf('%s page %s', $page->type()->value, $page->slug())] = TextSimilarity::fingerprint($page->article()->html);
        }
        $names = array_keys($fingerprints);
        $problems = [];

        foreach ($names as $index => $first) {
            foreach (\array_slice($names, $index + 1) as $second) {
                $similarity = TextSimilarity::between($fingerprints[$first], $fingerprints[$second]);

                if ($similarity >= TextSimilarity::LIMIT) {
                    $problems[] = \sprintf('%s and %s share %d%% of their text.', ucfirst($first), $second, round($similarity * 100));
                }
            }
        }

        return $problems;
    }
}
