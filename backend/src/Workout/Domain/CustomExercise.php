<?php

declare(strict_types=1);

namespace App\Workout\Domain;

use App\Shared\Domain\UserId;

/**
 * An exercise the user added to the catalog (§5.2). Attempts keep their own copy of its name (§5.3).
 */
final class CustomExercise
{
    private function __construct(
        private readonly ExerciseId $id,
        private UserId $owner,
        private string $name,
        // The name compared regardless of case, so the catalog has no two exercises with one name.
        private string $nameKey,
        private string $description,
        private readonly \DateTimeImmutable $createdAt,
        private \DateTimeImmutable $updatedAt,
    ) {
    }

    public static function create(ExerciseId $id, UserId $owner, ExerciseDetails $details, \DateTimeImmutable $now): self
    {
        return new self($id, $owner, $details->name, $details->nameKey, $details->description, $now, $now);
    }

    public function change(ExerciseDetails $details, \DateTimeImmutable $now): void
    {
        $this->name = $details->name;
        $this->nameKey = $details->nameKey;
        $this->description = $details->description;
        $this->updatedAt = $now;
    }

    public function id(): ExerciseId
    {
        return $this->id;
    }

    public function name(): string
    {
        return $this->name;
    }

    public function nameKey(): string
    {
        return $this->nameKey;
    }

    public function description(): string
    {
        return $this->description;
    }

    public function belongsTo(UserId $user): bool
    {
        return $this->owner->equals($user);
    }

    // §23.3: the exercise of a guest joins the catalog of the account under the same id.
    public function moveTo(UserId $owner): void
    {
        $this->owner = $owner;
    }
}
