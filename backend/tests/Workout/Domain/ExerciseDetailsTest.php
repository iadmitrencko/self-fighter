<?php

declare(strict_types=1);

namespace App\Tests\Workout\Domain;

use App\Workout\Domain\ExerciseDetails;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class ExerciseDetailsTest extends TestCase
{
    // The same clean-up as validateExerciseDraft() in frontend/src/domain/catalog/exercise.ts.
    public function testCleansUpTheNameAsTheBrowserDoes(): void
    {
        $details = ExerciseDetails::tryFrom("\u{00A0} Випади, широки\u{0438}\u{0306}\u{3000}", "  Крок уперед\u{FEFF}");

        self::assertNotNull($details);
        self::assertSame("Випади, широки\u{0439}", $details->name);
        self::assertSame('Крок уперед', $details->description);
    }

    public function testComparesNamesRegardlessOfCase(): void
    {
        self::assertSame(ExerciseDetails::tryFrom('бурпі', '')?->nameKey, ExerciseDetails::tryFrom('БУРПІ', '')?->nameKey);
        self::assertNotSame(ExerciseDetails::tryFrom('Їжак', '')?->nameKey, ExerciseDetails::tryFrom('Іжак', '')?->nameKey);
    }

    // §5.2, counted in characters as MySQL counts them, not in bytes.
    public function testKeepsTheLimits(): void
    {
        self::assertNotNull(ExerciseDetails::tryFrom(str_repeat('ж', 60), str_repeat('ї', 200)));
        self::assertNull(ExerciseDetails::tryFrom(str_repeat('ж', 61), ''));
        self::assertNull(ExerciseDetails::tryFrom('Бурпі', str_repeat('ї', 201)));
    }

    #[DataProvider('blankNames')]
    public function testRefusesABlankName(string $name): void
    {
        self::assertNull(ExerciseDetails::tryFrom($name, ''));
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function blankNames(): iterable
    {
        yield 'empty' => [''];
        yield 'spaces' => ['   '];
        yield 'non-breaking spaces' => ["\u{00A0}\u{2007}"];
    }
}
