<?php

declare(strict_types=1);

namespace App\Workout\Domain;

use App\Shared\Domain\Instant;
use App\Shared\Domain\UserId;

/**
 * A finished attempt. Its document never changes once saved (§17.2): the server keeps it as the
 * browser sent it. What the server counts itself, such as the energy of a battle of the game
 * (§24.4), lives beside the document.
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
        private readonly ?GamePool $pool,
        private readonly ?string $level,
        private readonly ?\DateTimeImmutable $energyFullAt,
        private readonly int $schemaVersion,
        private readonly \DateTimeImmutable $startedAt,
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
        $startedAt = Instant::parse(self::text($document['startedAt'] ?? null));
        $finishedAt = Instant::parse(self::text($document['finishedAt'] ?? null));
        $schemaVersion = $document['schemaVersion'] ?? null;
        // §24: a battle of the game names its pool of energy and the moment that pool is full again
        // as the browser counted it, and a level of the journey names its level, so the record of
        // the game is counted in SQL. The server counts the energy anew when it saves the battle.
        $game = $document['game'] ?? null;
        $pool = \is_array($game) ? GamePool::tryFrom(self::text($game['pool'] ?? null)) : null;
        $energyFullAt = \is_array($game) ? Instant::parse(self::text($game['energyFullAt'] ?? null)) : null;
        $config = \is_array($document['config'] ?? null) ? $document['config'] : [];
        // §24.9: a battle of the duel names its round as a level names itself.
        $level = match ($mode) {
            Mode::Campaign => self::text($config['level'] ?? null),
            Mode::Duel => self::text($config['round'] ?? null),
            default => '',
        };

        if (null === $id || null === $mode || null === $outcome || null === $startedAt || null === $finishedAt || !\is_int($schemaVersion)) {
            return null;
        }
        if ((\is_array($game) && (null === $pool || null === $energyFullAt))
            || ((Mode::Campaign === $mode || Mode::Duel === $mode) && (GamePool::Campaign !== $pool || '' === $level))
            // §6: a fight of the game always takes the energy of fights.
            || (Mode::Fight === $mode && GamePool::Fight !== $pool)
        ) {
            return null;
        }

        return new self(
            $id,
            $owner,
            $mode,
            $outcome,
            $pool,
            '' === $level ? null : $level,
            $energyFullAt,
            $schemaVersion,
            $startedAt,
            $finishedAt,
            $document,
        );
    }

    // §24.4: the same attempt with the moment its pool is full again as the server counted it.
    public function withEnergyFullAt(\DateTimeImmutable $energyFullAt): self
    {
        return new self(
            $this->id,
            $this->owner,
            $this->mode,
            $this->outcome,
            $this->pool,
            $this->level,
            $energyFullAt,
            $this->schemaVersion,
            $this->startedAt,
            $this->finishedAt,
            $this->document,
        );
    }

    public function id(): AttemptId
    {
        return $this->id;
    }

    // A battle of the game takes its energy when it starts (§24.4).
    public function startedAt(): \DateTimeImmutable
    {
        return $this->startedAt;
    }

    public function finishedAt(): \DateTimeImmutable
    {
        return $this->finishedAt;
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
