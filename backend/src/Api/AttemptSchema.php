<?php

declare(strict_types=1);

namespace App\Api;

use App\Entity\Mode;
use Opis\JsonSchema\Parsers\SchemaParser;
use Opis\JsonSchema\Resolvers\SchemaResolver;
use Opis\JsonSchema\SchemaLoader;
use Opis\JsonSchema\Validator;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * The structure and limits of attempts and configurations. Vitest checks the same file against
 * what frontend/src/domain produces, so the browser and the server agree on the format.
 */
final readonly class AttemptSchema
{
    // An identifier for references inside the file. It is never fetched.
    private const string URI = 'https://schema.self-fighter.invalid/attempt.json';

    private Validator $validator;

    public function __construct(#[Autowire('%kernel.project_dir%/schema/attempt.schema.json')] string $file)
    {
        $resolver = new SchemaResolver();
        $resolver->registerFile(self::URI, $file);
        $this->validator = new Validator(new SchemaLoader(new SchemaParser(), $resolver));
    }

    public function isAttempt(mixed $data): bool
    {
        return $this->validator->validate($data, self::URI)->isValid();
    }

    public function isConfig(mixed $data, Mode $mode): bool
    {
        $definition = match ($mode) {
            Mode::Target => 'targetConfig',
            Mode::RandomOpponent => 'randomOpponentConfig',
            Mode::OpponentLevels => 'opponentLevelsConfig',
            Mode::Ladder => 'ladderConfig',
        };

        return $this->validator->validate($data, self::URI.'#/definitions/'.$definition)->isValid();
    }
}
