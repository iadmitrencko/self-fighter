<?php

declare(strict_types=1);

namespace App\Content\Application;

use App\Content\Domain\Article;
use App\Content\Domain\PageType;
use App\Content\Domain\TextSimilarity;
use App\Shared\Domain\GameModes;

/**
 * What the content must satisfy before it reaches the site (sections 6.2 and 6.3 of the plan).
 * The texts of drafts count too, so a near-copy shows up before anyone reviews it.
 */
final readonly class ContentRules
{
    /**
     * @return list<string>
     */
    public function problems(Content $content): array
    {
        return [
            ...$this->brokenLinks($content),
            ...$this->unknownModes($content),
            ...$this->repeatedFields($content),
            ...$this->similarTexts($content),
        ];
    }

    /**
     * @return list<string>
     */
    private function brokenLinks(Content $content): array
    {
        $exercises = array_map(static fn ($exercise): string => $exercise->slug(), $content->exercises);
        $challenges = array_map(static fn ($challenge): string => $challenge->slug(), $content->challenges);
        $problems = [];

        foreach ($content->challenges as $challenge) {
            foreach (array_diff($challenge->exercises(), $exercises) as $missing) {
                $problems[] = \sprintf('Challenge %s uses the unknown exercise %s.', $challenge->slug(), $missing);
            }
            $links = array_filter([$challenge->easier(), $challenge->harder(), ...$challenge->related()], 'is_string');

            foreach (array_diff($links, $challenges) as $missing) {
                $problems[] = \sprintf('Challenge %s links to the unknown challenge %s.', $challenge->slug(), $missing);
            }
        }

        return $problems;
    }

    // A page of a mode and a challenge open the game in a mode it has.
    /**
     * @return list<string>
     */
    private function unknownModes(Content $content): array
    {
        $problems = [];

        foreach ($content->pages as $page) {
            if (PageType::Mode === $page->type() && !\in_array($page->slug(), GameModes::ALL, true)) {
                $problems[] = \sprintf('Mode page %s is not named after a mode of the game.', $page->slug());
            }
        }
        foreach ($content->challenges as $challenge) {
            if (!\in_array($challenge->mode(), GameModes::ALL, true)) {
                $problems[] = \sprintf('Challenge %s has the unknown mode %s.', $challenge->slug(), $challenge->mode());
            }
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

            foreach ($this->articles($content) as $name => $article) {
                $value = $article->{$field};

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

        foreach ($this->texts($content) as $name => $html) {
            $fingerprints[$name] = TextSimilarity::fingerprint($html);
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

    /**
     * @return iterable<string, Article>
     */
    private function articles(Content $content): iterable
    {
        foreach ($content->exercises as $exercise) {
            yield 'exercise '.$exercise->slug() => $exercise->article();
        }
        foreach ($content->pages as $page) {
            yield \sprintf('%s page %s', $page->type()->value, $page->slug()) => $page->article();
        }
        foreach ($content->challenges as $challenge) {
            yield 'challenge '.$challenge->slug() => $challenge->article();
        }
    }

    // The texts people write: a challenge takes the rest of its page from templates.
    /**
     * @return iterable<string, string>
     */
    private function texts(Content $content): iterable
    {
        foreach ($content->exercises as $exercise) {
            yield 'exercise '.$exercise->slug() => $exercise->article()->html;
        }
        foreach ($content->pages as $page) {
            yield \sprintf('%s page %s', $page->type()->value, $page->slug()) => $page->article()->html;
        }
        foreach ($content->challenges as $challenge) {
            if ('' !== $challenge->note()) {
                yield 'challenge '.$challenge->slug() => $challenge->note();
            }
        }
    }
}
