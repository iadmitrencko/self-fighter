<?php

declare(strict_types=1);

namespace App\Api;

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * The JSON body of a write.
 */
final readonly class JsonBody
{
    private const int DEPTH = 32;

    /**
     * @param mixed $data decoded into objects: a schema tells an empty object from an empty list
     */
    private function __construct(
        private string $json,
        public mixed $data,
    ) {
    }

    public static function read(Request $request, int $maxBytes): self
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
            return new self($json, json_decode($json, false, self::DEPTH, \JSON_THROW_ON_ERROR));
        } catch (\JsonException) {
            throw new ApiProblem(Response::HTTP_BAD_REQUEST, 'invalid-json');
        }
    }

    /**
     * @return array<mixed>
     */
    public function toArray(): array
    {
        $value = json_decode($this->json, true, self::DEPTH, \JSON_THROW_ON_ERROR);

        return \is_array($value) ? $value : [];
    }
}
