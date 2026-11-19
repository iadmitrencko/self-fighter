<?php

declare(strict_types=1);

namespace App\Tests\Analytics\Presentation\Console;

use App\Account\Application\DeleteUser;
use App\Analytics\Application\RecordEvent;
use App\Shared\Domain\UserId;
use App\Tests\Account\NewAccount;
use Symfony\Bundle\FrameworkBundle\Console\Application;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\Clock\Test\ClockSensitiveTrait;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Tester\CommandTester;

final class MetricsReportCommandTest extends KernelTestCase
{
    use ClockSensitiveTrait;

    // Three players: one comes back a week later, one the next day, one has just begun. A fourth one
    // stumbles on the setup and deletes the account, so the event stays without a player (§15.5).
    protected function setUp(): void
    {
        [$first, $second, $third, $gone] = [$this->signUp(), $this->signUp(), $this->signUp(), $this->signUp()];

        $this->record('2026-11-01 10:00:00', $first, 'workout_started');
        $this->record('2026-11-01 10:20:00', $first, 'workout_completed', ['outcome' => 'win']);
        $this->record('2026-11-01 10:21:00', $first, 'workout_repeated');
        $this->record('2026-11-01 10:21:00', $first, 'workout_started');
        $this->record('2026-11-09 08:00:00', $first, 'workout_started');

        $this->record('2026-11-01 21:00:00', $gone, 'setup_error', ['error' => 'exercises-required']);
        $this->deleteAccount($gone);
        $this->record('2026-11-01 21:05:00', $second, 'setup_error', ['error' => 'reps-invalid']);
        $this->record('2026-11-01 21:06:00', $second, 'workout_started');
        $this->record('2026-11-02 07:00:00', $second, 'workout_started');
        $this->record('2026-11-02 07:15:00', $second, 'workout_completed', ['outcome' => 'loss']);

        $this->record('2026-11-09 19:00:00', $third, 'workout_started');
    }

    // §19: who started, finished, repeated and came back, with the modes and the problems of the setup.
    public function testReportsEveryPlayerWhoStarted(): void
    {
        $report = $this->report([]);

        self::assertStringContainsString('started a first workout 3', $report);
        self::assertStringContainsString('completed a workout 2 67%', $report);
        self::assertStringContainsString('repeated a workout 1 33%', $report);
        self::assertStringContainsString('came back on another day 2 67%', $report);
        self::assertStringContainsString('came back a week later or more 1 33%', $report);
        self::assertStringContainsString('Mode Starts Completions Players --- fight 6 2 3', $report);
        self::assertStringContainsString('exercises-required 1 0 reps-invalid 1 1', $report);
    }

    // The players who began in a period: the first one is no newcomer on November 2.
    public function testReportsThePlayersWhoBeganInAPeriod(): void
    {
        $report = $this->report(['--since' => '2026-11-02']);

        self::assertStringContainsString('Players whose first workout started on 2026-11-02 or later', $report);
        self::assertStringContainsString('started a first workout 1', $report);
        self::assertStringContainsString('completed a workout 0 0%', $report);
        self::assertStringContainsString('came back on another day 0 0%', $report);
        self::assertStringContainsString('Mode Starts Completions Players --- fight 3 1 3', $report);
        self::assertStringNotContainsString('exercises-required', $report);
    }

    public function testRefusesADayItCannotRead(): void
    {
        $tester = $this->tester();

        self::assertSame(Command::INVALID, $tester->execute(['--since' => '2026-02-30']));
        self::assertStringContainsString('The --since option takes a day such as 2026-11-01.', $tester->getDisplay());
    }

    /**
     * The report on one line, each rule of a table as ---.
     *
     * @param array<string, string> $input
     */
    private function report(array $input): string
    {
        $tester = $this->tester();
        $tester->execute($input);
        $tester->assertCommandIsSuccessful();

        return (string) preg_replace(['/\s+/', '/-{2,}( -{2,})*/'], [' ', '---'], $tester->getDisplay());
    }

    private function tester(): CommandTester
    {
        return new CommandTester((new Application(self::bootKernel()))->find('app:metrics:report'));
    }

    private function signUp(): UserId
    {
        return NewAccount::signUp(self::getContainer())->user;
    }

    /**
     * @param array<string, string> $fields
     */
    private function record(string $time, UserId $user, string $name, array $fields = []): void
    {
        self::mockTime($time);
        $recordEvent = self::getContainer()->get(RecordEvent::class);
        self::assertInstanceOf(RecordEvent::class, $recordEvent);

        $recordEvent($user, json_encode(['name' => $name, 'mode' => 'fight', ...$fields], \JSON_THROW_ON_ERROR));
    }

    private function deleteAccount(UserId $user): void
    {
        $deleteUser = self::getContainer()->get(DeleteUser::class);
        self::assertInstanceOf(DeleteUser::class, $deleteUser);

        $deleteUser($user);
    }
}
