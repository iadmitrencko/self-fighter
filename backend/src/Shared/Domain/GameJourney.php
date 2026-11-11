<?php

declare(strict_types=1);

namespace App\Shared\Domain;

/**
 * The campaigns of the journey «Січ» as the addresses of the game name them (§24.5). The rules
 * of the journey live in frontend/src/domain/kozak; the server only needs the names.
 */
final class GameJourney
{
    public const string CAMPAIGNS = 'black-flag|steppe-wolves|forest-ravens|final-battle';
    // A stage or a level of a campaign by its number.
    public const string NUMBER = '[1-9][0-9]?';
}
