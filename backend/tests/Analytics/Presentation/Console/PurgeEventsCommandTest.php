<?php

declare(strict_types=1);

namespace App\Tests\Analytics\Presentation\Console;

use App\Analytics\Application\RecordEvent;
use App\Shared\Domain\UserId;
use App\Tests\Account\NewAccount;
use Doctrine\DBAL\Connection;
use Symfony\Bundle\FrameworkBundle\Console\Application;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\Clock\Test\ClockSensitiveTrait;
use Symfony\Component\Console\Tester\CommandTester;

final class PurgeEventsCommandTest extends KernelTestCase
{
    use ClockSensitiveTrait;

    public function testDeletesTheEventsOlderThanAYear(): void
    {
        $player = NewAccount::signUp(self::getContainer())->user;
        $this->record('2025-11-02 23:59:59', $player, 'workout_started');
        $this->record('2025-11-03 10:00:00', $player, 'workout_repeated');
        $this->record('2026-10-01 10:00:00', $player, 'workout_started');

        self::mockTime('2026-11-03 10:00:00');
        $tester = new CommandTester((new Application(self::bootKernel()))->find('app:events:purge'));
        $tester->execute([]);

        $tester->assertCommandIsSuccessful();
        self::assertStringContainsString('Deleted 1 events older than 12 months.', $tester->getDisplay());
        self::assertSame(
            ['2025-11-03 10:00:00', '2026-10-01 10:00:00'],
            $this->database()->fetchFirstColumn('SELECT occurred_at FROM analytics_event ORDER BY occurred_at'),
        );
    }

    private function record(string $time, UserId $user, string $name): void
    {
        self::mockTime($time);
        $recordEvent = self::getContainer()->get(RecordEvent::class);
        self::assertInstanceOf(RecordEvent::class, $recordEvent);

        $recordEvent($user, json_encode(['name' => $name, 'mode' => 'fight'], \JSON_THROW_ON_ERROR));
    }

    private function database(): Connection
    {
        $connection = self::getContainer()->get(Connection::class);
        self::assertInstanceOf(Connection::class, $connection);

        return $connection;
    }
}
