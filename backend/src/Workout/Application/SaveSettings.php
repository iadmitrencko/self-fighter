<?php

declare(strict_types=1);

namespace App\Workout\Application;

use App\Shared\Application\Refusal;
use App\Shared\Application\UserTransaction;
use App\Shared\Domain\UserId;
use App\Workout\Domain\Mode;
use App\Workout\Domain\Settings;
use App\Workout\Domain\SettingsRepository;
use Psr\Clock\ClockInterface;

final readonly class SaveSettings
{
    public function __construct(
        private SettingsRepository $settings,
        private AttemptFormat $format,
        private UserTransaction $transaction,
        private ClockInterface $clock,
    ) {
    }

    /**
     * @throws Refusal
     */
    public function __invoke(UserId $owner, Mode $mode, string $json): void
    {
        $configuration = $this->format->readConfiguration($json, $mode)
            ?? throw Refusal::invalid('invalid-settings');

        $this->transaction->run($owner, function () use ($owner, $mode, $configuration): void {
            $now = $this->clock->now();
            $settings = $this->settings->find($owner);

            if (null === $settings) {
                $settings = Settings::empty($owner, $now);
                $this->settings->add($settings);
            }

            $settings->remember($mode, $configuration, $now);
        });
    }
}
