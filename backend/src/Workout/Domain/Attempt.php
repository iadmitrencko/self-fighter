<?php

declare(strict_types=1);

namespace App\Workout\Domain;

use App\Shared\Domain\Instant;
use App\Shared\Domain\UserId;

/**
 * A finished attempt. It never changes once saved (§17.2). The game rules that produced it live
 * in frontend/src/domain, so the server keeps the document as the browser sent it.
 */
final class Attempt
{
    /**
     * @param array<mixed> $document
     */
    private function __construct(
        private readonly AttemptId $id,
        private readonly UserId $owner,
        private readonly Mode $mode,
        private readonly Outcome $outcome,
        private readonly ?string $challenge,
        private readonly ?GamePool $pool,
        private readonly ?string $level,
        private readonly ?\DateTimeImmutable $energyFullAt,
        private readonly int $schemaVersion,
        private readonly \DateTimeImmutable $finishedAt,
        private readonly array $document,
    ) {
    }

    /**
     * Takes the fields the history needs from a document of backend/schema/attempt.schema.json.
     * Returns null when they are missing, for example when it finished on February 30.
     *
     * @param array<mixed> $document
     */
    public static function fromDocument(UserId $owner, array $document): ?self
    {
        $result = \is_array($document['result'] ?? null) ? $document['result'] : [];
        $id = AttemptId::tryFrom(self::text($document['id'] ?? null));
        $mode = Mode::tryFrom(self::text($document['mode'] ?? null));
        $outcome = Outcome::tryFrom(self::text($result['outcome'] ?? null));
        $finishedAt = Instant::parse(self::text($document['finishedAt'] ?? null));
        $schemaVersion = $document['schemaVersion'] ?? null;
        // The slug of a ready-made challenge, so the statistics can count the ones passed (§21.3).
        $challenge = \is_array($document['challenge'] ?? null) ? self::text($document['challenge']['slug'] ?? null) : '';
        // §24: a battle of the game names its pool of energy and the moment that pool is full again,
        // and a level of the journey names its level, so the record of the game is counted in SQL.
        $game = $document['game'] ?? null;
        $pool = \is_array($game) ? GamePool::tryFrom(self::text($game['pool'] ?? null)) : null;
        $energyFullAt = \is_array($game) ? Instant::parse(self::text($game['energyFullAt'] ?? null)) : null;
        $config = \is_array($document['config'] ?? null) ? $document['config'] : [];
        $level = Mode::Campaign === $mode ? self::text($config['level'] ?? null) : '';

        if (null === $id || null === $mode || null === $outcome || null === $finishedAt || !\is_int($schemaVersion)) {
            return null;
        }
        if ((\is_array($game) && (null === $pool || null === $energyFullAt)) || (Mode::Campaign === $mode && (GamePool::Campaign !== $pool || '' === $level))) {
            return null;
        }

        return new self(
            $id,
            $owner,
            $mode,
            $outcome,
            '' === $challenge ? null : $challenge,
            $pool,
            '' === $level ? null : $level,
            $energyFullAt,
            $schemaVersion,
            $finishedAt,
            $document,
        );
    }

    public function id(): AttemptId
    {
        return $this->id;
    }

    public function finishedAt(): \DateTimeImmutable
    {
        return $this->finishedAt;
    }

    public function challenge(): ?string
    {
        return $this->challenge;
    }

    public function pool(): ?GamePool
    {
        return $this->pool;
    }

    public function level(): ?string
    {
        return $this->level;
    }

    public function energyFullAt(): ?\DateTimeImmutable
    {
        return $this->energyFullAt;
    }

    /**
     * @return array<mixed>
     */
    public function document(): array
    {
        return $this->document;
    }

    public function belongsTo(UserId $user): bool
    {
        return $this->owner->equals($user);
    }

    public function hasSameDocument(self $other): bool
    {
        return self::canonical($this->document) === self::canonical($other->document);
    }

    private static function text(mixed $value): string
    {
        return \is_string($value) ? $value : '';
    }

    /**
     * The database reorders the keys of a JSON object, so only the content may tell two documents apart.
     *
     * @param array<mixed> $value
     *
     * @return array<mixed>
     */
    private static function canonical(array $value): array
    {
        if (!array_is_list($value)) {
            ksort($value, \SORT_STRING);
        }

        return array_map(static fn (mixed $item): mixed => \is_array($item) ? self::canonical($item) : $item, $value);
    }
}
