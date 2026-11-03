<?php

declare(strict_types=1);

namespace App\Content\Domain;

/**
 * Near-duplicate texts (section 6.2 of the plan): the share of four-word runs two texts have in
 * common. Numbers count as one word, so a copy with other numbers keeps most of its runs, while
 * two texts on their own topics share almost none.
 */
final class TextSimilarity
{
    // Two of our texts on different topics share less than 5% of their runs.
    public const float LIMIT = 0.3;
    private const int RUN = 4;

    /**
     * @return array<string, true>
     */
    public static function fingerprint(string $html): array
    {
        $text = mb_strtolower(html_entity_decode(strip_tags($html), \ENT_QUOTES | \ENT_HTML5, 'UTF-8'));
        $words = array_map(
            static fn (string $word): string => ctype_digit($word) ? '#' : $word,
            preg_split('/[^\p{L}\p{N}\'’]+/u', $text, -1, \PREG_SPLIT_NO_EMPTY) ?: [],
        );
        $runs = [];

        for ($start = 0; $start + self::RUN <= \count($words); ++$start) {
            $runs[implode(' ', \array_slice($words, $start, self::RUN))] = true;
        }

        return $runs;
    }

    /**
     * @param array<string, true> $first
     * @param array<string, true> $second
     */
    public static function between(array $first, array $second): float
    {
        $all = \count($first + $second);

        return 0 === $all ? 0.0 : \count(array_intersect_key($first, $second)) / $all;
    }
}
