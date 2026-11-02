<?php

declare(strict_types=1);

namespace App\Tests\Account\Presentation\Console;

use App\Account\Application\SignUpGuest;
use App\Shared\Domain\UserId;
use App\Tests\Workout\Documents;
use App\Workout\Application\SaveAttempt;
use App\Workout\Domain\AttemptId;
use Doctrine\DBAL\Connection;
use Symfony\Bundle\FrameworkBundle\Console\Application;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\Clock\Test\ClockSensitiveTrait;
use Symfony\Component\Console\Tester\CommandTester;

final class PurgeGuestsCommandTest extends KernelTestCase
{
    use ClockSensitiveTrait;

    public function testDeletesGuestsWhoseCookieHasExpiredWithTheirData(): void
    {
        self::mockTime('2025-09-27 10:00:00');
        $forgotten = $this->signUpGuest();
        $this->saveAttempt($forgotten);
        self::mockTime('2025-09-28 10:00:00');
        $returning = $this->signUpGuest();

        // 400 days after the forgotten guest was last seen and a day before the returning one expires.
        self::mockTime('2026-11-01 10:00:00');
        $output = $this->purge();

        self::assertStringContainsString('Deleted 1 expired devices and 1 unreachable guests.', $output);
        self::assertSame([$returning->toBytes()], $this->database()->fetchFirstColumn('SELECT id FROM user'));
        self::assertSame(0, (int) $this->database()->fetchOne('SELECT COUNT(*) FROM attempt'));
    }

    public function testKeepsGuestsWithinTheCookieLifetime(): void
    {
        self::mockTime('2026-11-01 10:00:00');
        $this->signUpGuest();

        self::mockTime('2027-12-05 10:00:00');
        $output = $this->purge();

        self::assertStringContainsString('Deleted 0 expired devices and 0 unreachable guests.', $output);
        self::assertSame(1, (int) $this->database()->fetchOne('SELECT COUNT(*) FROM user'));
    }

    private function signUpGuest(): UserId
    {
        $signUpGuest = self::getContainer()->get(SignUpGuest::class);
        self::assertInstanceOf(SignUpGuest::class, $signUpGuest);

        return $signUpGuest()->user->id();
    }

    private function saveAttempt(UserId $owner): void
    {
        $saveAttempt = self::getContainer()->get(SaveAttempt::class);
        self::assertInstanceOf(SaveAttempt::class, $saveAttempt);
        $attempt = Documents::ladder();

        $saveAttempt($owner, AttemptId::fromString((string) $attempt['id']), json_encode($attempt, \JSON_THROW_ON_ERROR));
    }

    private function purge(): string
    {
        $tester = new CommandTester((new Application(self::bootKernel()))->find('app:guests:purge'));
        $tester->execute([]);
        $tester->assertCommandIsSuccessful();

        return $tester->getDisplay();
    }

    private function database(): Connection
    {
        $connection = self::getContainer()->get(Connection::class);
        self::assertInstanceOf(Connection::class, $connection);

        return $connection;
    }
}
