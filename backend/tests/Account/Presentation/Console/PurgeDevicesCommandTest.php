<?php

declare(strict_types=1);

namespace App\Tests\Account\Presentation\Console;

use App\Shared\Domain\Instant;
use App\Shared\Domain\UserId;
use App\Tests\Account\NewAccount;
use App\Tests\Workout\Documents;
use App\Workout\Application\SaveAttempt;
use App\Workout\Domain\AttemptId;
use Doctrine\DBAL\Connection;
use Symfony\Bundle\FrameworkBundle\Console\Application;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\Clock\Clock;
use Symfony\Component\Clock\Test\ClockSensitiveTrait;
use Symfony\Component\Console\Tester\CommandTester;

final class PurgeDevicesCommandTest extends KernelTestCase
{
    use ClockSensitiveTrait;

    // §23.1: an account opens on any browser, so it stays with its data after its browsers are gone.
    public function testDeletesDevicesWhoseCookieHasExpiredAndKeepsTheirAccounts(): void
    {
        self::mockTime('2025-09-27 10:00:00');
        $forgotten = NewAccount::signUp(self::getContainer());
        $this->saveAttempt($forgotten->user);
        self::mockTime('2025-09-28 10:00:00');
        NewAccount::signUp(self::getContainer());

        // 400 days after the forgotten browser was last seen and a day before the other one expires.
        self::mockTime('2026-11-01 10:00:00');
        $output = $this->purge();

        self::assertStringContainsString('Deleted 1 expired devices.', $output);
        self::assertSame(1, $this->rows('device'));
        self::assertSame(2, $this->rows('user'));
        self::assertSame(1, $this->rows('attempt'));
    }

    public function testKeepsDevicesWithinTheCookieLifetime(): void
    {
        self::mockTime('2026-11-01 10:00:00');
        NewAccount::signUp(self::getContainer());

        self::mockTime('2027-12-05 10:00:00');
        $output = $this->purge();

        self::assertStringContainsString('Deleted 0 expired devices.', $output);
        self::assertSame(1, $this->rows('device'));
    }

    private function saveAttempt(UserId $owner): void
    {
        $saveAttempt = self::getContainer()->get(SaveAttempt::class);
        self::assertInstanceOf(SaveAttempt::class, $saveAttempt);
        // A level played now: the server takes a battle of the last days only (§24.4).
        $now = Instant::format(Clock::get()->now());
        $attempt = Documents::level(overrides: ['startedAt' => $now, 'finishedAt' => $now]);

        $saveAttempt($owner, AttemptId::fromString((string) $attempt['id']), json_encode($attempt, \JSON_THROW_ON_ERROR));
    }

    private function purge(): string
    {
        $tester = new CommandTester((new Application(self::bootKernel()))->find('app:devices:purge'));
        $tester->execute([]);
        $tester->assertCommandIsSuccessful();

        return $tester->getDisplay();
    }

    private function rows(string $table): int
    {
        $connection = self::getContainer()->get(Connection::class);
        self::assertInstanceOf(Connection::class, $connection);

        return (int) $connection->fetchOne(\sprintf('SELECT COUNT(*) FROM %s', $table));
    }
}
