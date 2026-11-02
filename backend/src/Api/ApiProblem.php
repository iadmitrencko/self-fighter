<?php

declare(strict_types=1);

namespace App\Api;

use Psr\Log\LogLevel;
use Symfony\Component\HttpKernel\Attribute\WithLogLevel;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\RateLimiter\RateLimit;

/**
 * A request the API refuses. The browser turns the error code into a message.
 */
#[WithLogLevel(LogLevel::NOTICE)]
final class ApiProblem extends HttpException
{
    /**
     * @param array<string, string> $headers
     */
    public function __construct(int $statusCode, public readonly string $error, array $headers = [])
    {
        parent::__construct($statusCode, $error, null, $headers);
    }

    public static function tooManyRequests(RateLimit $limit): self
    {
        $seconds = max(1, $limit->getRetryAfter()->getTimestamp() - time());

        return new self(429, 'rate-limited', ['Retry-After' => (string) $seconds]);
    }
}
