<?php

declare(strict_types=1);

namespace App\Analytics\Application;

/**
 * The fields an event may carry (backend/schema/event.schema.json). The browser checks the same
 * file in its tests, so the game sends nothing the server would refuse.
 */
interface EventFormat
{
    /**
     * @return array<mixed>|null the fields of the event, or null when the JSON is not an event
     */
    public function readEvent(string $json): ?array;
}
