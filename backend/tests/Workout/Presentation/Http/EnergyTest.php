<?php

declare(strict_types=1);

namespace App\Tests\Workout\Presentation\Http;

use App\Tests\Shared\Presentation\Http\ApiTestCase;
use App\Tests\Workout\Documents;
use Symfony\Component\Clock\Test\ClockSensitiveTrait;

/**
 * §24.4: the server keeps the energy of the game, so a battle starts only while its pool has a unit,
 * whatever the browser says.
 */
final class EnergyTest extends ApiTestCase
{
    use ClockSensitiveTrait;

    protected function setUp(): void
    {
        parent::setUp();
        self::mockTime('2026-11-02 12:00:00 UTC');
    }

    public function testAPoolLetsAsManyBattlesStartTogetherAsItHolds(): void
    {
        $this->signUp();
        $this->fights(10, '2026-11-02T10:00:00.000Z');

        $this->save($extra = $this->fight('2026-11-02T10:00:00.000Z'));

        $this->assertError(409, 'no-energy');
        $this->send('GET', '/api/v1/attempts/'.$extra['id']);
        self::assertResponseStatusCodeSame(404);
        // Ten units come back in twenty hours.
        self::assertSame('2026-11-03T06:00:00.000Z', $this->energyFullAt('fight'));
    }

    public function testAUnitComesBackAfterItsPeriod(): void
    {
        $this->signUp();
        $this->fights(10, '2026-11-02T10:00:00.000Z');

        $this->save($this->fight('2026-11-02T11:00:00.000Z'));
        $this->assertError(409, 'no-energy');

        $this->save($this->fight('2026-11-02T12:00:00.000Z'));
        self::assertResponseStatusCodeSame(201);
        self::assertSame('2026-11-03T08:00:00.000Z', $this->energyFullAt('fight'));
    }

    public function testTheJourneyHoldsSixUnits(): void
    {
        $this->signUp();

        for ($level = 0; $level < 6; ++$level) {
            $this->save($this->level('2026-11-02T10:00:00.000Z'));
            self::assertResponseStatusCodeSame(201);
        }
        $this->save($this->level('2026-11-02T10:00:00.000Z'));

        $this->assertError(409, 'no-energy');
        self::assertSame('2026-11-02T22:00:00.000Z', $this->energyFullAt('campaign'));
        // The fights have a pool of their own.
        $this->save($this->fight('2026-11-02T10:00:00.000Z'));
        self::assertResponseStatusCodeSame(201);
    }

    // §15.4: a battle that waited in the browser counts where it started and moves the later ones.
    public function testABattleThatWaitedInTheBrowserCountsInItsPlace(): void
    {
        $this->signUp();
        $this->fights(2, '2026-11-02T10:00:00.000Z');
        self::assertSame('2026-11-02T14:00:00.000Z', $this->energyFullAt('fight'));

        $this->save($this->fight('2026-11-02T09:00:00.000Z'));

        self::assertResponseStatusCodeSame(201);
        self::assertSame('2026-11-02T15:00:00.000Z', $this->energyFullAt('fight'));
    }

    public function testABattleThatWaitedCannotTakeTheUnitOfALaterOne(): void
    {
        $this->signUp();
        $this->fights(10, '2026-11-02T10:00:00.000Z');

        $this->save($this->fight('2026-11-02T09:00:00.000Z'));
        $this->assertError(409, 'no-energy');

        // A day before, the pool was full again long before those ten.
        $this->save($this->fight('2026-11-01T09:00:00.000Z'));
        self::assertResponseStatusCodeSame(201);
        self::assertSame('2026-11-03T06:00:00.000Z', $this->energyFullAt('fight'));
    }

    // A battle waits in the browser a week at most, and a clock may run a day ahead.
    public function testABattleOutOfTimeIsRefused(): void
    {
        $this->signUp();

        foreach (['2026-10-26T11:59:00.000Z', '2026-11-03T12:01:00.000Z'] as $startedAt) {
            $this->save($this->fight($startedAt));
            $this->assertError(409, 'battle-out-of-time');
        }
        foreach (['2026-10-26T12:01:00.000Z', '2026-11-03T11:59:00.000Z'] as $startedAt) {
            $this->save($this->fight($startedAt));
            self::assertResponseStatusCodeSame(201);
        }
    }

    // §17.2: a battle saved once may be sent again however late, and changes nothing.
    public function testABattleSentAgainLaterChangesNothing(): void
    {
        $this->signUp();
        $this->save($fight = $this->fight('2026-11-02T10:00:00.000Z'));

        self::mockTime('2026-11-20 12:00:00 UTC');
        $this->save($fight);

        self::assertResponseStatusCodeSame(204);
    }

    public function testTheBrowserDoesNotChooseTheEnergy(): void
    {
        $this->signUp();

        $this->save(Documents::fight(overrides: [
            'startedAt' => '2026-11-02T10:00:00.000Z',
            'game' => Documents::game('fight', '2026-11-01T00:00:00.000Z'),
        ]));

        self::assertResponseStatusCodeSame(201);
        self::assertSame('2026-11-02T12:00:00.000Z', $this->energyFullAt('fight'));
    }

    public function testAWorkoutOfTheSiteTakesNoEnergy(): void
    {
        $this->signUp();

        for ($workout = 0; $workout < 12; ++$workout) {
            $this->save(Documents::target());
            self::assertResponseStatusCodeSame(201);
        }

        self::assertNull($this->energyFullAt('fight'));
    }

    // §23.3: the battles of a guest join those of the account, which counts its energy anew.
    public function testJoiningAGuestAddsItsBattlesToTheEnergy(): void
    {
        $this->signInWithGoogle(['sub' => '1001']);
        $this->fights(6, '2026-11-02T10:00:00.000Z');
        $this->switchBrowser();
        $this->signUp();
        $this->fights(6, '2026-11-02T10:00:00.000Z');
        $this->signInWithGoogle(['sub' => '1001']);

        $this->send('POST', '/api/v1/me/merge');

        self::assertResponseIsSuccessful();
        // Twelve battles from 10:00 take two pools: the next unit is back only the next morning.
        self::assertSame('2026-11-03T10:00:00.000Z', $this->energyFullAt('fight'));
        $this->save($this->fight('2026-11-02T12:00:00.000Z'));
        $this->assertError(409, 'no-energy');
    }

    /**
     * @param array<string, mixed> $attempt
     */
    private function save(array $attempt): void
    {
        $id = $attempt['id'];
        self::assertIsString($id);

        $this->send('PUT', '/api/v1/attempts/'.$id, $attempt);
    }

    // Battles of fights that start together, each saved.
    private function fights(int $count, string $startedAt): void
    {
        for ($fight = 0; $fight < $count; ++$fight) {
            $this->save($this->fight($startedAt));
            self::assertResponseStatusCodeSame(201);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function fight(string $startedAt): array
    {
        return Documents::fight(overrides: ['startedAt' => $startedAt, 'finishedAt' => $startedAt]);
    }

    /**
     * @return array<string, mixed>
     */
    private function level(string $startedAt): array
    {
        return Documents::level(overrides: ['startedAt' => $startedAt, 'finishedAt' => $startedAt]);
    }

    private function energyFullAt(string $pool): ?string
    {
        $this->send('GET', '/api/v1/game');
        $energy = $this->responseData()['energy'] ?? null;
        self::assertIsArray($energy);
        $fullAt = $energy[$pool] ?? null;
        self::assertTrue(null === $fullAt || \is_string($fullAt));

        return $fullAt;
    }
}
