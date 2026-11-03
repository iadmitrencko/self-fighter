<?php

declare(strict_types=1);

namespace App\Content\Domain;

enum PageType: string
{
    case Mode = 'mode';
    case Guide = 'guide';
    // «Про проєкт» and other pages about the site itself.
    case Service = 'service';
}
