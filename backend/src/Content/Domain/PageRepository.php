<?php

declare(strict_types=1);

namespace App\Content\Domain;

interface PageRepository
{
    /**
     * @param list<Page> $pages
     */
    public function replaceAll(array $pages): void;

    /**
     * @return list<Page> in the order of the catalog
     */
    public function ofType(PageType $type): array;

    public function find(PageType $type, string $slug): ?Page;
}
