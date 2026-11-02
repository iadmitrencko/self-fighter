<?php

declare(strict_types=1);

namespace App\Shared\Presentation\Http;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

final class Json
{
    public static function response(mixed $data, int $status = Response::HTTP_OK): JsonResponse
    {
        $response = new JsonResponse(null, $status);
        // Cyrillic as UTF-8 takes a third of the space of \u escapes.
        $response->setEncodingOptions(JsonResponse::DEFAULT_ENCODING_OPTIONS | \JSON_UNESCAPED_UNICODE);

        return $response->setData($data);
    }
}
