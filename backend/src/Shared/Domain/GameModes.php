<?php

declare(strict_types=1);

namespace App\Shared\Domain;

/**
 * The modes of the game as its addresses name them (section 3.4 of the plan). The rules of each
 * mode live in frontend/src/domain; the server only needs the names.
 */
final class GameModes
{
    public const array ALL = ['target', 'random-opponent', 'opponent-levels', 'ladder'];
    public const string PATTERN = 'target|random-opponent|opponent-levels|ladder';
}
