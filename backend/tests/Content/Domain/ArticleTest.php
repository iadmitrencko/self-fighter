<?php

declare(strict_types=1);

namespace App\Tests\Content\Domain;

use App\Content\Domain\Article;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class ArticleTest extends TestCase
{
    // Section 6.3 of the plan: what a search result shows fits into it.
    public function testFitsIntoASearchResult(): void
    {
        $article = new Article(str_repeat('т', 60), str_repeat('о', 155), 'Заголовок', 'Вступ', '');

        self::assertSame(60, mb_strlen($article->title));
    }

    /**
     * @return iterable<string, array{string, string, string, string, string}>
     */
    public static function brokenArticles(): iterable
    {
        yield 'no title' => [' ', 'Опис', 'Заголовок', 'Вступ', 'The title is empty.'];
        yield 'no heading' => ['Назва', 'Опис', '', 'Вступ', 'The heading is empty.'];
        yield 'no lead' => ['Назва', 'Опис', 'Заголовок', '', 'The lead is empty.'];
        yield 'a long title' => [str_repeat('т', 61), 'Опис', 'Заголовок', 'Вступ', 'is longer than 60 characters'];
        yield 'a long description' => ['Назва', str_repeat('о', 156), 'Заголовок', 'Вступ', 'The description of "Назва" is longer than 155 characters.'];
    }

    #[DataProvider('brokenArticles')]
    public function testRefusesWhatASearchResultCannotShow(string $title, string $description, string $heading, string $lead, string $error): void
    {
        $this->expectExceptionMessage($error);

        new Article($title, $description, $heading, $lead, '');
    }
}
