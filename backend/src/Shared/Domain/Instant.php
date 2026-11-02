<?php

declare(strict_types=1);

namespace App\Shared\Domain;

/**
 * Time in the format of Date.prototype.toISOString(), the only one the browser and the server exchange.
 */
final class Instant
{
    private const string FORMAT = 'Y-m-d\TH:i:s.v\Z';

    public static function format(\DateTimeImmutable $time): string
    {
        return $time->setTimezone(new \DateTimeZone('UTC'))->format(self::FORMAT);
    }

    public static function parse(string $value): ?\DateTimeImmutable
    {
        $time = \DateTimeImmutable::createFromFormat('!'.self::FORMAT, $value, new \DateTimeZone('UTC'));

        // February 30 quietly becomes March 2, so only a value that survives the round trip is a real date.
        return false !== $time && self::format($time) === $value ? $time : null;
    }
}
