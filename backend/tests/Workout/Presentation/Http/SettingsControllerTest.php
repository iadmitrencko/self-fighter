<?php

declare(strict_types=1);

namespace App\Tests\Workout\Presentation\Http;

use App\Tests\Shared\Presentation\Http\ApiTestCase;
use App\Tests\Workout\Documents;

final class SettingsControllerTest extends ApiTestCase
{
    public function testKeepsTheLastConfigurationOfEachMode(): void
    {
        $this->signUp();
        $target = Documents::targetConfig();

        $this->send('PUT', '/api/v1/settings/target', $target);
        $this->send('PUT', '/api/v1/settings/ladder', Documents::ladderConfig());
        $this->send('PUT', '/api/v1/settings/target', [...$target, 'rule' => 'meet']);

        self::assertResponseStatusCodeSame(204);
        $this->send('GET', '/api/v1/settings');
        self::assertEquals(
            ['ladder' => Documents::ladderConfig(), 'target' => [...$target, 'rule' => 'meet']],
            $this->responseData(),
        );
    }

    public function testUsersHaveSeparateSettings(): void
    {
        $this->signUp();
        $this->send('PUT', '/api/v1/settings/target', Documents::targetConfig());
        $mine = $this->deviceCookie();

        $this->switchBrowser();
        $this->signUp();
        $this->send('GET', '/api/v1/settings');
        self::assertSame('{}', $this->browser->getResponse()->getContent());
        $this->send('PUT', '/api/v1/settings/ladder', Documents::ladderConfig());

        $this->switchBrowser($mine);
        $this->send('GET', '/api/v1/settings');
        self::assertEquals(['target' => Documents::targetConfig()], $this->responseData());
    }

    // The browser reads the settings as an object, even before the first one is saved.
    public function testNoSettingsYetIsAnEmptyObject(): void
    {
        $this->signUp();

        $this->send('GET', '/api/v1/settings');

        self::assertSame('{}', $this->browser->getResponse()->getContent());
    }

    public function testConfigurationMustBelongToTheMode(): void
    {
        $this->signUp();

        $this->send('PUT', '/api/v1/settings/target', Documents::ladderConfig());

        $this->assertError(422, 'invalid-settings');
    }

    public function testConfigurationOutsideTheLimitsIsRefused(): void
    {
        $this->signUp();

        $this->send('PUT', '/api/v1/settings/target', [...Documents::targetConfig(), 'rounds' => 21]);

        $this->assertError(422, 'invalid-settings');
        self::assertSame(0, $this->rowCount('workout_settings'));
    }

    public function testUnknownModeIsNotFound(): void
    {
        $this->signUp();

        $this->send('PUT', '/api/v1/settings/boxing', Documents::targetConfig());

        $this->assertError(404, 'not-found');
    }
}
