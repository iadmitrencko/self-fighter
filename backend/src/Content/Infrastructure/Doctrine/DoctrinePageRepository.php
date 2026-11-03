<?php

declare(strict_types=1);

namespace App\Content\Infrastructure\Doctrine;

use App\Content\Domain\Page;
use App\Content\Domain\PageRepository;
use App\Content\Domain\PageType;
use Doctrine\ORM\EntityManagerInterface;

final readonly class DoctrinePageRepository implements PageRepository
{
    public function __construct(private EntityManagerInterface $entityManager)
    {
    }

    public function replaceAll(array $pages): void
    {
        $this->entityManager->createQuery('DELETE FROM App\Content\Domain\Page p')->execute();

        foreach ($pages as $page) {
            $this->entityManager->persist($page);
        }
    }

    public function ofType(PageType $type): array
    {
        return $this->entityManager->getRepository(Page::class)->findBy(['type' => $type], ['position' => 'ASC', 'slug' => 'ASC']);
    }

    public function find(PageType $type, string $slug): ?Page
    {
        return $this->entityManager->find(Page::class, ['type' => $type, 'slug' => $slug]);
    }
}
