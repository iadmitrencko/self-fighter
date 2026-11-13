<?php

declare(strict_types=1);

namespace App\Content\Domain;

// The guides of the site are gone since version 1.13 of the specification (§21.2).
enum PageType: string
{
    // «Про проєкт» and other pages about the site itself.
    case Service = 'service';
}
