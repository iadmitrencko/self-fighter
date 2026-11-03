<?php

declare(strict_types=1);

namespace App\Tests\Content\Domain;

use App\Content\Domain\TextSimilarity;
use PHPUnit\Framework\TestCase;

final class TextSimilarityTest extends TestCase
{
    private const string TEXT = '<p>Сто віджимань за тренування звучать серйозно, але десять підходів по десять посильні для тих, хто впевнено робить 15–20 повторень за раз. Головне — не поспішати на початку: перші раунди здаються легкими, і з\'являється спокуса скоротити відпочинок.</p>';

    public function testFindsACopyWithOtherNumbers(): void
    {
        $copy = str_replace(['Сто', 'десять', '15–20'], ['Двісті', 'двадцять', '25–30'], self::TEXT);

        self::assertGreaterThanOrEqual(TextSimilarity::LIMIT, $this->similarity(self::TEXT, $copy));
        self::assertSame(1.0, $this->similarity(self::TEXT, strip_tags(self::TEXT)));
    }

    public function testTellsTextsOnTheirOwnTopicsApart(): void
    {
        $other = '<p>Сто присідань — найдоступніша з круглих цифр: ноги витримують більше повторень, ніж руки.</p>';

        self::assertLessThan(0.05, $this->similarity(self::TEXT, $other));
    }

    // Markup and letter case do not make two texts different.
    public function testReadsTheWordsOnly(): void
    {
        self::assertSame(
            TextSimilarity::fingerprint('<strong>Тримай</strong> пряму лінію &mdash; тіла й на спуску'),
            TextSimilarity::fingerprint('тримай ПРЯМУ лінію тіла й на спуску'),
        );
        self::assertSame(0.0, $this->similarity('Три слова лише', 'Три слова лише'));
    }

    private function similarity(string $first, string $second): float
    {
        return TextSimilarity::between(TextSimilarity::fingerprint($first), TextSimilarity::fingerprint($second));
    }
}
