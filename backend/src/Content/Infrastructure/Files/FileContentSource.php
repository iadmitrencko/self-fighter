<?php

declare(strict_types=1);

namespace App\Content\Infrastructure\Files;

use App\Content\Application\Content;
use App\Content\Application\ContentSource;
use App\Content\Application\InvalidContent;
use App\Content\Domain\Article;
use App\Content\Domain\Challenge;
use App\Content\Domain\Demand;
use App\Content\Domain\Exercise;
use App\Content\Domain\Level;
use App\Content\Domain\Page;
use App\Content\Domain\PageType;
use League\CommonMark\Environment\Environment;
use League\CommonMark\Extension\CommonMark\CommonMarkCoreExtension;
use League\CommonMark\Extension\FrontMatter\FrontMatterExtension;
use League\CommonMark\Extension\FrontMatter\Output\RenderedContentWithFrontMatter;
use League\CommonMark\Extension\Table\TableExtension;
use League\CommonMark\MarkdownConverter;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Reads backend/content: Markdown files with a YAML front matter, and the challenges that
 * frontend/scripts/generate-challenges.ts expanded from the matrix.
 */
final readonly class FileContentSource implements ContentSource
{
    private const array PAGE_TYPES = ['modes' => PageType::Mode, 'guides' => PageType::Guide, 'pages' => PageType::Service];

    private MarkdownConverter $markdown;

    public function __construct(
        #[Autowire('%kernel.project_dir%/content')]
        private string $directory,
    ) {
        // The authors write Markdown only: raw HTML in a file is shown as text.
        $environment = new Environment(['html_input' => 'escape', 'allow_unsafe_links' => false]);
        $environment->addExtension(new CommonMarkCoreExtension());
        $environment->addExtension(new TableExtension());
        $environment->addExtension(new FrontMatterExtension());
        $this->markdown = new MarkdownConverter($environment);
    }

    public function read(): Content
    {
        $problems = [];
        $exercises = $this->documents('exercises', static fn (string $slug, FrontMatter $front, string $html): Exercise => new Exercise(
            $slug,
            $front->string('name'),
            $front->bool('in_game'),
            $front->int('position'),
            self::article($front, $html),
            $front->bool('reviewed'),
            $front->date('updated'),
        ), $problems);
        $pages = [];

        foreach (self::PAGE_TYPES as $directory => $type) {
            $pages = [...$pages, ...$this->documents($directory, static fn (string $slug, FrontMatter $front, string $html): Page => new Page(
                $type,
                $slug,
                $front->int('position'),
                self::article($front, $html),
                $front->bool('reviewed'),
                $front->date('updated'),
            ), $problems)];
        }
        $challenges = $this->challenges($problems);

        if ([] !== $problems) {
            throw new InvalidContent($problems);
        }

        return new Content($exercises, $pages, $challenges);
    }

    /**
     * @template T
     *
     * @param callable(string, FrontMatter, string): T $create
     * @param list<string>                             $problems
     *
     * @return list<T>
     */
    private function documents(string $directory, callable $create, array &$problems): array
    {
        $documents = [];

        foreach (glob(\sprintf('%s/%s/*.md', $this->directory, $directory)) ?: [] as $file) {
            try {
                [$front, $html] = $this->render($file);
                $documents[] = $create(basename($file, '.md'), $front, $html);
            } catch (\InvalidArgumentException $exception) {
                $problems[] = \sprintf('%s: %s', $this->relative($file), $exception->getMessage());
            }
        }

        return $documents;
    }

    /**
     * @param list<string> $problems
     *
     * @return list<Challenge>
     */
    private function challenges(array &$problems): array
    {
        $file = $this->directory.'/challenges/generated.json';

        if (!is_file($file)) {
            return [];
        }
        $entries = json_decode((string) file_get_contents($file), true, 512, \JSON_THROW_ON_ERROR);
        $challenges = [];

        foreach (\is_array($entries) ? $entries : [] as $entry) {
            try {
                $challenges[] = $this->challenge(new GeneratedChallenge($entry));
            } catch (\InvalidArgumentException|\ValueError $exception) {
                $problems[] = \sprintf('%s: %s', $this->relative($file), $exception->getMessage());
            }
        }

        return $challenges;
    }

    private function challenge(GeneratedChallenge $entry): Challenge
    {
        $slug = $entry->string('slug');
        $noteFile = \sprintf('%s/challenges/notes/%s.md', $this->directory, $slug);
        // Without its own text a challenge stays out of the index (§21.4).
        [$note, $reviewed, $updated] = ['', false, $entry->date('updated')];

        if (is_file($noteFile)) {
            [$front, $note] = $this->render($noteFile);
            $reviewed = $front->bool('reviewed');
            $updated = max($updated, $front->date('updated'));
        }

        return new Challenge(
            $slug,
            $entry->string('mode'),
            $entry->strings('exercises'),
            Level::from($entry->string('level')),
            Demand::from($entry->string('demand')),
            $entry->map('config'),
            $entry->map('program'),
            $entry->int('stages'),
            $entry->int('totalReps'),
            $entry->optionalString('easier'),
            $entry->optionalString('harder'),
            $entry->strings('related'),
            $entry->int('position'),
            new Article(
                $entry->string('title'),
                $entry->string('description'),
                $entry->string('heading'),
                $entry->string('lead'),
                '',
            ),
            $note,
            $reviewed,
            $updated,
        );
    }

    /**
     * @return array{FrontMatter, string}
     */
    private function render(string $file): array
    {
        $result = $this->markdown->convert((string) file_get_contents($file));
        $fields = $result instanceof RenderedContentWithFrontMatter ? $result->getFrontMatter() : null;

        if (!\is_array($fields)) {
            throw new \InvalidArgumentException('The file has no front matter.');
        }

        return [new FrontMatter($fields), trim($result->getContent())];
    }

    private static function article(FrontMatter $front, string $html): Article
    {
        return new Article(
            $front->string('title'),
            $front->string('description'),
            $front->string('heading'),
            $front->string('lead'),
            $html,
        );
    }

    private function relative(string $file): string
    {
        return substr($file, \strlen(\dirname($this->directory)) + 1);
    }
}
