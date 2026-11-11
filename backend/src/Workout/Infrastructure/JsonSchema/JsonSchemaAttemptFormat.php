<?php

declare(strict_types=1);

namespace App\Workout\Infrastructure\JsonSchema;

use App\Workout\Application\AttemptFormat;
use App\Workout\Domain\Mode;
use Opis\JsonSchema\Parsers\SchemaParser;
use Opis\JsonSchema\Resolvers\SchemaResolver;
use Opis\JsonSchema\SchemaLoader;
use Opis\JsonSchema\Validator;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

final readonly class JsonSchemaAttemptFormat implements AttemptFormat
{
    // An identifier for references inside the file. It is never fetched.
    private const string URI = 'https://schema.self-fighter.invalid/attempt.json';
    private const int DEPTH = 32;

    private Validator $validator;

    public function __construct(#[Autowire('%kernel.project_dir%/schema/attempt.schema.json')] string $file)
    {
        $resolver = new SchemaResolver();
        $resolver->registerFile(self::URI, $file);
        $this->validator = new Validator(new SchemaLoader(new SchemaParser(), $resolver));
    }

    public function readAttempt(string $json): ?array
    {
        $attempt = $this->read($json, self::URI);

        // A tab opened before the release or an attempt that waited for the network still speaks
        // version 2. It was a workout of the site, and the history keeps every attempt in one format.
        return null !== $attempt && 2 === $attempt['schemaVersion']
            ? ['schemaVersion' => self::VERSION, 'game' => null] + $attempt
            : $attempt;
    }

    public function readConfiguration(string $json, Mode $mode): ?array
    {
        $definition = match ($mode) {
            Mode::Target => 'targetConfig',
            Mode::RandomOpponent => 'randomOpponentConfig',
            Mode::OpponentLevels => 'opponentLevelsConfig',
            Mode::Ladder => 'ladderConfig',
            // The journey sets its levels: the player keeps no settings for them (§24.5).
            Mode::Campaign => null,
        };

        return null === $definition ? null : $this->read($json, self::URI.'#/definitions/'.$definition);
    }

    /**
     * @return array<mixed>|null
     */
    private function read(string $json, string $schema): ?array
    {
        try {
            // Objects stay objects for the check: a schema tells an empty object from an empty list.
            $valid = $this->validator->validate(json_decode($json, false, self::DEPTH, \JSON_THROW_ON_ERROR), $schema)->isValid();
            $value = json_decode($json, true, self::DEPTH, \JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return null;
        }

        return $valid && \is_array($value) ? $value : null;
    }
}
