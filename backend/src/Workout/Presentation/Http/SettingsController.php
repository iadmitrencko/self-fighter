<?php

declare(strict_types=1);

namespace App\Workout\Presentation\Http;

use App\Shared\Domain\UserId;
use App\Shared\Presentation\Http\Json;
use App\Shared\Presentation\Http\JsonBody;
use App\Workout\Application\FindSettings;
use App\Workout\Application\SaveSettings;
use App\Workout\Domain\Mode;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\EnumRequirement;

/**
 * The last configuration of each mode, so the next workout starts from it.
 */
final readonly class SettingsController
{
    private const int MAX_BYTES = 64 * 1024;

    public function __construct(
        private FindSettings $findSettings,
        private SaveSettings $saveSettings,
    ) {
    }

    #[Route('/api/v1/settings', name: 'api_settings', methods: ['GET'])]
    public function list(UserId $user): JsonResponse
    {
        // An object even when empty, keyed by the mode.
        return Json::response((object) ($this->findSettings)($user));
    }

    #[Route('/api/v1/settings/{mode}', name: 'api_settings_save', methods: ['PUT'], requirements: ['mode' => new EnumRequirement(Mode::class)])]
    public function save(Mode $mode, Request $request, UserId $user): Response
    {
        ($this->saveSettings)($user, $mode, JsonBody::read($request, self::MAX_BYTES));

        return new Response(null, Response::HTTP_NO_CONTENT);
    }
}
