<?php

declare(strict_types=1);

namespace App\Tests\Content\Presentation\Console;

use Symfony\Bundle\FrameworkBundle\Console\Application;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\Console\Tester\CommandTester;

final class ContentCommandsTest extends KernelTestCase
{
    // Section 6.6 of the plan: make lint checks the content of Git before it reaches the site.
    public function testLintAcceptsTheContentOfTheSite(): void
    {
        $tester = $this->runCommand('app:content:lint');

        self::assertSame(0, $tester->getStatusCode());
        self::assertMatchesRegularExpression('/The content is fine\. \d+ of \d+ pages can be indexed/', $tester->getDisplay(true));
    }

    public function testSyncCopiesTheContentIntoTheDatabase(): void
    {
        $tester = $this->runCommand('app:content:sync');

        self::assertSame(0, $tester->getStatusCode());
        self::assertMatchesRegularExpression('/Synced \d+ exercises, \d+ pages and \d+ challenges\./', $tester->getDisplay(true));
    }

    private function runCommand(string $command): CommandTester
    {
        $tester = new CommandTester((new Application(self::bootKernel()))->find($command));
        $tester->execute([]);

        return $tester;
    }
}
