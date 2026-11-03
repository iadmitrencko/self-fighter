<?php

declare(strict_types=1);

namespace App\Tests\Analytics\Presentation\Console;

use App\Account\Application\SignUpGuest;
use App\Analytics\Application\RecordEvent;
use App\Shared\Domain\UserId;
use Symfony\Bundle\FrameworkBundle\Console\Application;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\Clock\Test\ClockSensitiveTrait;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Tester\CommandTester;

final class MetricsReportCommandTest extends KernelTestCase
{
    use ClockSensitiveTrait;

    // Three players: one comes back a week later, one the next day, one has just begun.
    protected function setUp(): void
    {
        [$first, $second, $third] = [$this->signUpGuest(), $this->signUpGuest(), $this->signUpGuest()];

        $this->record('2026-11-01 10:00:00', $first, 'workout_started', 'target');
        $this->record('2026-11-01 10:20:00', $first, 'workout_completed', 'target', ['outcome' => 'win']);
        $this->record('2026-11-01 10:21:00', $first, 'workout_repeated', 'target');
        $this->record('2026-11-01 10:21:00', $first, 'workout_started', 'target');
        $this->record('2026-11-09 08:00:00', $first, 'workout_started', 'random-opponent');

        $this->record('2026-11-01 21:00:00', null, 'setup_error', 'target', ['error' => 'target-required']);
        $this->record('2026-11-01 21:05:00', $second, 'setup_error', 'ladder', ['error' => 'ladder-max-invalid']);
        $this->record('2026-11-01 21:06:00', $second, 'workout_started', 'ladder');
        $this->record('2026-11-02 07:00:00', $second, 'workout_started', 'ladder');
        $this->record('2026-11-02 07:15:00', $second, 'workout_completed', 'ladder', ['outcome' => 'loss']);

        $this->record('2026-11-09 19:00:00', $third, 'workout_started', 'opponent-levels');
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
        self::assertStringContainsString('Mode Starts Completions Players --- ladder 2 1 1 target 2 1 1 opponent-levels 1 0 1 random-opponent 1 0 1', $report);
        self::assertStringContainsString('ladder-max-invalid 1 1 target-required 1 0', $report);
    }

    // The players who began in a period: the first one is no newcomer on November 2.
    public function testReportsThePlayersWhoBeganInAPeriod(): void
    {
        $report = $this->report(['--since' => '2026-11-02']);

        self::assertStringContainsString('Players whose first workout started on 2026-11-02 or later', $report);
        self::assertStringContainsString('started a first workout 1', $report);
        self::assertStringContainsString('completed a workout 0 0%', $report);
        self::assertStringContainsString('came back on another day 0 0%', $report);
        self::assertStringContainsString('Mode Starts Completions Players --- ladder 1 1 1 opponent-levels 1 0 1 random-opponent 1 0 1', $report);
        self::assertStringNotContainsString('target-required', $report);
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

    private function signUpGuest(): UserId
    {
        $signUpGuest = self::getContainer()->get(SignUpGuest::class);
        self::assertInstanceOf(SignUpGuest::class, $signUpGuest);

        return $signUpGuest()->user->id();
    }

    /**
     * @param array<string, string> $fields
     */
    private function record(string $time, ?UserId $user, string $name, string $mode, array $fields = []): void
    {
        self::mockTime($time);
        $recordEvent = self::getContainer()->get(RecordEvent::class);
        self::assertInstanceOf(RecordEvent::class, $recordEvent);

        $recordEvent($user, json_encode(['name' => $name, 'mode' => $mode, ...$fields], \JSON_THROW_ON_ERROR));
    }
}
