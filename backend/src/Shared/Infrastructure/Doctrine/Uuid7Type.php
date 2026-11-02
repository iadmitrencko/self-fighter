<?php

declare(strict_types=1);

namespace App\Shared\Infrastructure\Doctrine;

use App\Shared\Domain\Uuid7;
use Doctrine\DBAL\ParameterType;
use Doctrine\DBAL\Platforms\AbstractPlatform;
use Doctrine\DBAL\Types\Exception\InvalidType;
use Doctrine\DBAL\Types\Exception\ValueNotConvertible;
use Doctrine\DBAL\Types\Type;

/**
 * Keeps an identifier in 16 bytes instead of 36 characters, so the indexes stay small.
 */
abstract class Uuid7Type extends Type
{
    /**
     * @return class-string<Uuid7>
     */
    abstract protected function idClass(): string;

    public function getSQLDeclaration(array $column, AbstractPlatform $platform): string
    {
        return $platform->getBinaryTypeDeclarationSQL(['length' => 16, 'fixed' => true]);
    }

    public function convertToPHPValue(mixed $value, AbstractPlatform $platform): ?Uuid7
    {
        if (null === $value) {
            return null;
        }

        try {
            return $this->idClass()::fromBytes(\is_string($value) ? $value : '');
        } catch (\InvalidArgumentException $exception) {
            throw ValueNotConvertible::new($value, static::class, null, $exception);
        }
    }

    public function convertToDatabaseValue(mixed $value, AbstractPlatform $platform): ?string
    {
        $idClass = $this->idClass();

        return match (true) {
            null === $value => null,
            $value instanceof $idClass => $value->toBytes(),
            default => throw InvalidType::new($value, static::class, ['null', $idClass]),
        };
    }

    public function getBindingType(): ParameterType
    {
        return ParameterType::BINARY;
    }
}
