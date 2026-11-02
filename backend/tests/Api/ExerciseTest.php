<?php

declare(strict_types=1);

namespace App\Tests\Api;

use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Component\Uid\Uuid;

final class ExerciseTest extends ApiTestCase
{
    public function testCreatesAndRenamesExercise(): void
    {
        $this->signUp();
        $id = Uuid::v7()->toRfc4122();

        // A decomposed «й» and spaces around the name, as a careless keyboard may send them.
        $this->send('PUT', '/api/v1/exercises/'.$id, ['name' => "  Випади, широки\u{0438}\u{0306}\u{00A0}", 'description' => ' ']);

        self::assertResponseStatusCodeSame(201);
        self::assertSame(['id' => $id, 'name' => "Випади, широки\u{0439}", 'description' => ''], $this->responseData());

        $this->send('PUT', '/api/v1/exercises/'.$id, ['name' => 'Бурпі', 'description' => 'Зі стрибком']);

        self::assertResponseStatusCodeSame(200);
        $this->send('GET', '/api/v1/me');
        self::assertSame([['id' => $id, 'name' => 'Бурпі', 'description' => 'Зі стрибком']], $this->responseData()['exercises']);
    }

    // §5.2: a name repeats no other name of the catalog, whatever the case.
    public function testNamesAreUniqueRegardlessOfCase(): void
    {
        $this->signUp();
        $burpee = Uuid::v7()->toRfc4122();
        $this->send('PUT', '/api/v1/exercises/'.$burpee, ['name' => 'Бурпі', 'description' => '']);

        $this->send('PUT', '/api/v1/exercises/'.Uuid::v7(), ['name' => 'БУРПІ', 'description' => '']);
        $this->assertError(409, 'exercise-name-taken');

        $this->send('PUT', '/api/v1/exercises/'.$burpee, ['name' => 'БУРПІ', 'description' => '']);
        self::assertResponseStatusCodeSame(200);
    }

    // The default MySQL collation would take «ї» for «і» and refuse a different word.
    public function testLettersWithMarksStayDistinct(): void
    {
        $this->signUp();

        $this->send('PUT', '/api/v1/exercises/'.Uuid::v7(), ['name' => 'Їжак', 'description' => '']);
        $this->send('PUT', '/api/v1/exercises/'.Uuid::v7(), ['name' => 'Іжак', 'description' => '']);

        self::assertResponseStatusCodeSame(201);
        self::assertSame(2, $this->rowCount('custom_exercise'));
    }

    public function testUsersHaveSeparateCatalogs(): void
    {
        $this->signUp();
        $id = Uuid::v7()->toRfc4122();
        $this->send('PUT', '/api/v1/exercises/'.$id, ['name' => 'Бурпі', 'description' => '']);

        $this->switchBrowser();
        $this->signUp();

        $this->send('PUT', '/api/v1/exercises/'.Uuid::v7(), ['name' => 'Бурпі', 'description' => '']);
        self::assertResponseStatusCodeSame(201);

        $this->send('PUT', '/api/v1/exercises/'.$id, ['name' => 'Чуже', 'description' => '']);
        $this->assertError(409, 'conflict');

        $this->send('DELETE', '/api/v1/exercises/'.$id);
        self::assertResponseStatusCodeSame(204);
        self::assertSame(2, $this->rowCount('custom_exercise'));
    }

    /**
     * @param array<string, mixed> $exercise
     */
    #[DataProvider('invalidExercises')]
    public function testExerciseOutsideTheLimitsIsRefused(array $exercise): void
    {
        $this->signUp();

        $this->send('PUT', '/api/v1/exercises/'.Uuid::v7(), $exercise);

        $this->assertError(422, 'invalid-exercise');
    }

    /**
     * @return iterable<string, array{array<string, mixed>}>
     */
    public static function invalidExercises(): iterable
    {
        yield 'blank name' => [['name' => " \u{00A0}", 'description' => '']];
        yield 'name of 61 characters' => [['name' => str_repeat('ж', 61), 'description' => '']];
        yield 'description of 201 characters' => [['name' => 'Бурпі', 'description' => str_repeat('ж', 201)]];
        yield 'missing description' => [['name' => 'Бурпі']];
        yield 'unknown field' => [['name' => 'Бурпі', 'description' => '', 'reps' => 10]];
        yield 'name that is not text' => [['name' => 42, 'description' => '']];
    }

    // Limits count characters as MySQL does, not bytes: 60 Cyrillic letters take 120 bytes.
    public function testLimitsCountCharacters(): void
    {
        $this->signUp();

        $this->send('PUT', '/api/v1/exercises/'.Uuid::v7(), ['name' => str_repeat('ж', 60), 'description' => str_repeat('ї', 200)]);

        self::assertResponseStatusCodeSame(201);
    }

    public function testDeletingIsSafeToRepeat(): void
    {
        $this->signUp();
        $id = Uuid::v7()->toRfc4122();
        $this->send('PUT', '/api/v1/exercises/'.$id, ['name' => 'Бурпі', 'description' => '']);

        $this->send('DELETE', '/api/v1/exercises/'.$id);
        $this->send('DELETE', '/api/v1/exercises/'.$id);

        self::assertResponseStatusCodeSame(204);
        self::assertSame(0, $this->rowCount('custom_exercise'));
    }
}
