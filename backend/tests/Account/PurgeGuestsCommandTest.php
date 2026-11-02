<?php

declare(strict_types=1);

namespace App\Tests\Account;

use App\Account\Guests;
use App\Entity\Attempt;
use App\Entity\Mode;
use App\Entity\Outcome;
use App\Entity\User;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Console\Application;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\Clock\Test\ClockSensitiveTrait;
use Symfony\Component\Console\Tester\CommandTester;
use Symfony\Component\Uid\Uuid;

final class PurgeGuestsCommandTest extends KernelTestCase
{
    use ClockSensitiveTrait;

    public function testDeletesGuestsWhoseCookieHasExpiredWithTheirData(): void
    {
        self::mockTime('2025-09-27 10:00:00');
        $forgotten = $this->createGuest();
        $this->saveAttempt($forgotten);
        self::mockTime('2025-09-28 10:00:00');
        $returning = $this->createGuest();

        // 400 days after the forgotten guest was last seen and a day before the returning one expires.
        self::mockTime('2026-11-01 10:00:00');
        $output = $this->purge();

        self::assertStringContainsString('Deleted 1 expired devices and 1 unreachable guests.', $output);
        self::assertSame([$returning->getId()->toBinary()], $this->database()->fetchFirstColumn('SELECT id FROM user'));
        self::assertSame(0, (int) $this->database()->fetchOne('SELECT COUNT(*) FROM attempt'));
    }

    public function testKeepsGuestsWithinTheCookieLifetime(): void
    {
        self::mockTime('2026-11-01 10:00:00');
        $this->createGuest();

        self::mockTime('2027-12-05 10:00:00');
        $output = $this->purge();

        self::assertStringContainsString('Deleted 0 expired devices and 0 unreachable guests.', $output);
        self::assertSame(1, (int) $this->database()->fetchOne('SELECT COUNT(*) FROM user'));
    }

    private function createGuest(): User
    {
        $guests = self::getContainer()->get(Guests::class);
        self::assertInstanceOf(Guests::class, $guests);

        return $guests->create()[0];
    }

    private function saveAttempt(User $user): void
    {
        $entityManager = self::getContainer()->get(EntityManagerInterface::class);
        self::assertInstanceOf(EntityManagerInterface::class, $entityManager);
        $entityManager->persist(new Attempt(Uuid::v7(), $user, Mode::Ladder, Outcome::Win, 1, new \DateTimeImmutable(), ['mode' => 'ladder']));
        $entityManager->flush();
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
