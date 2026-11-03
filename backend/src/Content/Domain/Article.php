<?php

declare(strict_types=1);

namespace App\Content\Domain;

/**
 * The text of a content page and the fields search engines read (§21.5).
 */
final readonly class Article
{
    public const int TITLE_MAX = 60;
    public const int DESCRIPTION_MAX = 155;

    /**
     * @param string $title       the title of the browser tab and of a search result
     * @param string $description the snippet of a search result
     * @param string $lead        the first paragraph, also shown in lists of pages
     * @param string $html        the body, rendered from Markdown
     */
    public function __construct(
        public string $title,
        public string $description,
        public string $heading,
        public string $lead,
        public string $html,
    ) {
        foreach (['title' => $title, 'description' => $description, 'heading' => $heading, 'lead' => $lead] as $field => $value) {
            if ('' === trim($value)) {
                throw new \InvalidArgumentException(\sprintf('The %s is empty.', $field));
            }
        }
        if (mb_strlen($title) > self::TITLE_MAX) {
            throw new \InvalidArgumentException(\sprintf('The title "%s" is longer than %d characters.', $title, self::TITLE_MAX));
        }
        if (mb_strlen($description) > self::DESCRIPTION_MAX) {
            throw new \InvalidArgumentException(\sprintf('The description of "%s" is longer than %d characters.', $title, self::DESCRIPTION_MAX));
        }
    }
}
