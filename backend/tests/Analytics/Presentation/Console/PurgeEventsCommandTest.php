<?php

declare(strict_types=1);

namespace App\Tests\Analytics\Presentation\Console;

use App\Analytics\Application\RecordEvent;
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
        $this->record('2025-11-02 23:59:59', 'target');
        $this->record('2025-11-03 10:00:00', 'ladder');
        $this->record('2026-10-01 10:00:00', 'random-opponent');

        self::mockTime('2026-11-03 10:00:00');
        $tester = new CommandTester((new Application(self::bootKernel()))->find('app:events:purge'));
        $tester->execute([]);

        $tester->assertCommandIsSuccessful();
        self::assertStringContainsString('Deleted 1 events older than 12 months.', $tester->getDisplay());
        self::assertSame(['ladder', 'random-opponent'], $this->database()->fetchFirstColumn('SELECT mode FROM analytics_event ORDER BY occurred_at'));
    }

    private function record(string $time, string $mode): void
    {
        self::mockTime($time);
        $recordEvent = self::getContainer()->get(RecordEvent::class);
        self::assertInstanceOf(RecordEvent::class, $recordEvent);

        $recordEvent(null, json_encode(['name' => 'workout_started', 'mode' => $mode], \JSON_THROW_ON_ERROR));
    }

    private function database(): Connection
    {
        $connection = self::getContainer()->get(Connection::class);
        self::assertInstanceOf(Connection::class, $connection);

        return $connection;
    }
}
