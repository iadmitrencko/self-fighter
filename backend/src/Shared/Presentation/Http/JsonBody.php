<?php

declare(strict_types=1);

namespace App\Shared\Presentation\Http;

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * The JSON body of a write.
 */
final class JsonBody
{
    private const int DEPTH = 32;

    // The JSON text, once it is known to be well-formed.
    public static function read(Request $request, int $maxBytes): string
    {
        // A cross-site form cannot send JSON without asking the browser for permission first.
        if ('json' !== $request->getContentTypeFormat()) {
            throw new ApiProblem(Response::HTTP_UNSUPPORTED_MEDIA_TYPE, 'json-required');
        }

        // The declared length is checked before the body is read into memory.
        if ((int) $request->headers->get('Content-Length') > $maxBytes || \strlen($json = $request->getContent()) > $maxBytes) {
            throw new ApiProblem(Response::HTTP_REQUEST_ENTITY_TOO_LARGE, 'too-large');
        }

        try {
            json_decode($json, false, self::DEPTH, \JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw new ApiProblem(Response::HTTP_BAD_REQUEST, 'invalid-json');
        }

        return $json;
    }

    /**
     * The fields of a JSON object, or null when the body holds anything else.
     *
     * @return array<string, mixed>|null
     */
    public static function fields(Request $request, int $maxBytes): ?array
    {
        $data = json_decode(self::read($request, $maxBytes), false, self::DEPTH, \JSON_THROW_ON_ERROR);

        return $data instanceof \stdClass ? get_object_vars($data) : null;
    }
}
