<?php

declare(strict_types=1);

namespace App\Tests\Workout\Presentation\Http;

use App\Tests\Shared\Presentation\Http\ApiTestCase;
use App\Tests\Workout\Documents;

final class SettingsControllerTest extends ApiTestCase
{
    // §6: the last fight the player put together, so the next one starts from it.
    public function testKeepsTheLastFight(): void
    {
        $this->signUp();
        $fight = Documents::fightConfig();
        $longer = ['mode' => 'fight', 'exercises' => [['id' => 'pull-ups', 'name' => 'Підтягування', 'sets' => [3, 3, 3, 3]]]];

        $this->send('PUT', '/api/v1/settings/fight', $longer);
        $this->send('PUT', '/api/v1/settings/fight', $fight);

        self::assertResponseStatusCodeSame(204);
        $this->send('GET', '/api/v1/settings');
        self::assertEquals(['fight' => $fight], $this->responseData());
    }

    public function testUsersHaveSeparateSettings(): void
    {
        $this->signUp();
        $this->send('PUT', '/api/v1/settings/fight', Documents::fightConfig());
        $mine = $this->deviceCookie();

        $this->switchBrowser();
        $this->signUp();
        $this->send('GET', '/api/v1/settings');
        self::assertSame('{}', $this->browser->getResponse()->getContent());

        $this->switchBrowser($mine);
        $this->send('GET', '/api/v1/settings');
        self::assertEquals(['fight' => Documents::fightConfig()], $this->responseData());
    }

    // The browser reads the settings as an object, even before the first one is saved.
    public function testNoSettingsYetIsAnEmptyObject(): void
    {
        $this->signUp();

        $this->send('GET', '/api/v1/settings');

        self::assertSame('{}', $this->browser->getResponse()->getContent());
    }

    public function testConfigurationMustBeAFight(): void
    {
        $this->signUp();

        $this->send('PUT', '/api/v1/settings/fight', ['mode' => 'ladder', 'rule' => 'over', 'exercise' => ['id' => 'pull-ups', 'name' => 'Підтягування'], 'max' => 2, 'returnDown' => false]);

        $this->assertError(422, 'invalid-settings');
    }

    /**
     * @return iterable<string, array{array<mixed>}>
     */
    public static function fightsOutsideTheLimits(): iterable
    {
        $set = static fn (array $sets): array => ['mode' => 'fight', 'exercises' => [['id' => 'squats', 'name' => 'Присідання', 'sets' => $sets]]];

        yield 'no exercise' => [['mode' => 'fight', 'exercises' => []]];
        yield 'a set of nothing' => [$set([0])];
        yield 'a set beyond 999' => [$set([1000])];
        yield 'eleven rounds' => [$set(array_fill(0, 11, 5))];
    }

    /**
     * @param array<mixed> $fight
     */
    #[\PHPUnit\Framework\Attributes\DataProvider('fightsOutsideTheLimits')]
    public function testFightOutsideTheLimitsIsRefused(array $fight): void
    {
        $this->signUp();

        $this->send('PUT', '/api/v1/settings/fight', $fight);

        $this->assertError(422, 'invalid-settings');
        self::assertSame(0, $this->rowCount('workout_settings'));
    }

    // The modes of the site before a fight was put together freely (§6) are gone, settings and all.
    public function testUnknownModesHaveNoSettings(): void
    {
        $this->signUp();

        foreach (['ladder', 'target', 'boxing'] as $mode) {
            $this->send('PUT', '/api/v1/settings/'.$mode, Documents::fightConfig());

            $this->assertError(404, 'not-found');
        }
    }

    // §24.5: the journey sets its levels, so the player keeps no settings for them.
    public function testLevelsOfTheJourneyHaveNoSettings(): void
    {
        $this->signUp();

        $this->send('PUT', '/api/v1/settings/campaign', Documents::level()['config']);

        $this->assertError(404, 'not-found');
    }
}
