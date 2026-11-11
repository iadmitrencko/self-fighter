<?php

declare(strict_types=1);

namespace App\Shared\Application;

/**
 * What the page of the game takes from the content of the site: Symfony puts it into the page,
 * so the game needs no request for it (section 3.5 of the plan).
 */
interface GameContent
{
    /**
     * The ready-made exercises of §5.1, in the order of the catalog.
     *
     * @return list<array{id: string, name: string}>
     */
    public function exercises(): array;
}
