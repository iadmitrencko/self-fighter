<?php

declare(strict_types=1);

namespace App\Api;

use App\Entity\CustomExercise;
use App\Entity\User;
use App\Entity\UserSetting;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * The shapes the browser receives. They mirror the types in frontend/src/storage/contract.ts.
 */
final class Payload
{
    public static function json(mixed $data, int $status = Response::HTTP_OK): JsonResponse
    {
        $response = new JsonResponse(null, $status);
        // Cyrillic as UTF-8 takes a third of the space of \u escapes.
        $response->setEncodingOptions(JsonResponse::DEFAULT_ENCODING_OPTIONS | \JSON_UNESCAPED_UNICODE);

        return $response->setData($data);
    }

    /**
     * @return array{id: string, kind: string, createdAt: string}
     */
    public static function user(User $user): array
    {
        return [
            'id' => $user->getUserIdentifier(),
            'kind' => 'guest',
            'createdAt' => Instant::format($user->getCreatedAt()),
        ];
    }

    /**
     * @return array{id: string, name: string, description: string}
     */
    public static function exercise(CustomExercise $exercise): array
    {
        return [
            'id' => $exercise->getId()->toRfc4122(),
            'name' => $exercise->getName(),
            'description' => $exercise->getDescription(),
        ];
    }

    /**
     * The last configuration of each mode, keyed by the mode.
     *
     * @param list<UserSetting> $settings
     */
    public static function settings(array $settings): \stdClass
    {
        $map = new \stdClass();

        foreach ($settings as $setting) {
            $map->{$setting->getName()} = $setting->getValue();
        }

        return $map;
    }
}
