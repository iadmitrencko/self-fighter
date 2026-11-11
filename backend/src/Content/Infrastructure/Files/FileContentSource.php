<?php

declare(strict_types=1);

namespace App\Content\Infrastructure\Files;

use App\Content\Application\Content;
use App\Content\Application\ContentSource;
use App\Content\Application\InvalidContent;
use App\Content\Domain\Article;
use App\Content\Domain\Exercise;
use App\Content\Domain\Page;
use App\Content\Domain\PageType;
use League\CommonMark\Environment\Environment;
use League\CommonMark\Extension\CommonMark\CommonMarkCoreExtension;
use League\CommonMark\Extension\FrontMatter\FrontMatterExtension;
use League\CommonMark\Extension\FrontMatter\Output\RenderedContentWithFrontMatter;
use League\CommonMark\Extension\Table\TableExtension;
use League\CommonMark\MarkdownConverter;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\Yaml\Exception\ParseException;
use Symfony\Component\Yaml\Yaml;

/**
 * Reads backend/content: the catalog of exercises of the game in exercises.yaml and the pages,
 * Markdown files with a YAML front matter.
 */
final readonly class FileContentSource implements ContentSource
{
    private const array PAGE_TYPES = ['guides' => PageType::Guide, 'pages' => PageType::Service];

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
        $exercises = $this->exercises($problems);
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

        if ([] !== $problems) {
            throw new InvalidContent($problems);
        }

        return new Content($exercises, $pages);
    }

    /**
     * The order of the file is the order of the catalog.
     *
     * @param list<string> $problems
     *
     * @return list<Exercise>
     */
    private function exercises(array &$problems): array
    {
        $file = $this->directory.'/exercises.yaml';

        if (!is_file($file)) {
            $problems[] = \sprintf('%s: the catalog of exercises of the game is missing.', $this->relative($file));

            return [];
        }

        try {
            $entries = Yaml::parse((string) file_get_contents($file));
        } catch (ParseException $exception) {
            $problems[] = \sprintf('%s: %s', $this->relative($file), $exception->getMessage());

            return [];
        }
        $exercises = [];

        foreach (\is_array($entries) ? array_values($entries) : [] as $index => $entry) {
            try {
                $fields = new FrontMatter(\is_array($entry) ? $entry : []);
                $exercises[] = new Exercise($fields->string('slug'), $fields->string('name'), $index + 1);
            } catch (\InvalidArgumentException $exception) {
                $problems[] = \sprintf('%s, exercise %d: %s', $this->relative($file), $index + 1, $exception->getMessage());
            }
        }
        if ([] === $exercises && [] === $problems) {
            $problems[] = \sprintf('%s: the game needs at least one exercise.', $this->relative($file));
        }

        return $exercises;
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
