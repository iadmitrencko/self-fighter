<?php

declare(strict_types=1);

namespace App\Workout\Domain;

enum Mode: string
{
    // §6: a fight the player puts together from exercises and rounds.
    case Fight = 'fight';
    // §24.5: a level of the journey of the game. The journey sets it, so it has no settings.
    case Campaign = 'campaign';
    // §24.9: a battle of the duel with the King of robbers, the final battle of the journey.
    case Duel = 'duel';
}
