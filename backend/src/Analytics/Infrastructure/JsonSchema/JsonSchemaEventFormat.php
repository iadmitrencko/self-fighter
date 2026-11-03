<?php

declare(strict_types=1);

namespace App\Analytics\Infrastructure\JsonSchema;

use App\Analytics\Application\EventFormat;
use Opis\JsonSchema\Parsers\SchemaParser;
use Opis\JsonSchema\Resolvers\SchemaResolver;
use Opis\JsonSchema\SchemaLoader;
use Opis\JsonSchema\Validator;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

final readonly class JsonSchemaEventFormat implements EventFormat
{
    // An identifier for references inside the file. It is never fetched.
    private const string URI = 'https://schema.self-fighter.invalid/event.json';
    private const int DEPTH = 8;

    private Validator $validator;

    public function __construct(#[Autowire('%kernel.project_dir%/schema/event.schema.json')] string $file)
    {
        $resolver = new SchemaResolver();
        $resolver->registerFile(self::URI, $file);
        $this->validator = new Validator(new SchemaLoader(new SchemaParser(), $resolver));
    }

    public function readEvent(string $json): ?array
    {
        try {
            // Objects stay objects for the check: a list is not an event.
            $valid = $this->validator->validate(json_decode($json, false, self::DEPTH, \JSON_THROW_ON_ERROR), self::URI)->isValid();
            $value = json_decode($json, true, self::DEPTH, \JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return null;
        }

        return $valid && \is_array($value) ? $value : null;
    }
}
