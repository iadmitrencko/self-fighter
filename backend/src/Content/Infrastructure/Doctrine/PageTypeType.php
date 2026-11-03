<?php

declare(strict_types=1);

namespace App\Content\Infrastructure\Doctrine;

use App\Content\Domain\PageType;
use Doctrine\DBAL\Platforms\AbstractPlatform;
use Doctrine\DBAL\Types\Type;

/**
 * The type of a page as part of its key. The XML mapping cannot put an enum on an id, a type can.
 */
final class PageTypeType extends Type
{
    public const string NAME = 'page_type';

    public function getSQLDeclaration(array $column, AbstractPlatform $platform): string
    {
        return $platform->getStringTypeDeclarationSQL(['length' => 16] + $column);
    }

    public function convertToPHPValue(mixed $value, AbstractPlatform $platform): ?PageType
    {
        return null === $value ? null : PageType::from((string) $value);
    }

    // Queries pass the enum already turned into its value, entities pass the enum itself.
    public function convertToDatabaseValue(mixed $value, AbstractPlatform $platform): ?string
    {
        return match (true) {
            null === $value => null,
            $value instanceof PageType => $value->value,
            default => PageType::from((string) $value)->value,
        };
    }
}
