<?php

declare(strict_types=1);

namespace App\Api;

use App\Entity\Mode;
use App\Entity\User;
use App\Entity\UserSetting;
use App\Repository\UserSettingRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Clock\ClockInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\EnumRequirement;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * The last configuration of each mode, so the next workout starts from it.
 */
final readonly class SettingController
{
    private const int MAX_BYTES = 64 * 1024;

    public function __construct(
        private UserSettingRepository $settings,
        private AttemptSchema $schema,
        private UserWrites $writes,
        private EntityManagerInterface $entityManager,
        private ClockInterface $clock,
    ) {
    }

    #[Route('/api/v1/settings/{mode}', name: 'api_setting_save', methods: ['PUT'], requirements: ['mode' => new EnumRequirement(Mode::class)])]
    public function save(Mode $mode, Request $request, #[CurrentUser] User $user): Response
    {
        $body = JsonBody::read($request, self::MAX_BYTES);

        if (!$this->schema->isConfig($body->data, $mode)) {
            throw new ApiProblem(Response::HTTP_UNPROCESSABLE_ENTITY, 'invalid-settings');
        }

        $config = $body->toArray();

        $this->writes->run($user, function () use ($mode, $user, $config): void {
            $setting = $this->settings->findOneForUser($user, $mode);

            if (null === $setting) {
                $this->entityManager->persist(new UserSetting($user, $mode, $config, $this->clock->now()));

                return;
            }

            $setting->change($config, $this->clock->now());
        });

        return new Response(null, Response::HTTP_NO_CONTENT);
    }
}
