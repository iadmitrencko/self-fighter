<?php

declare(strict_types=1);

namespace App\Content\Application;

// The content lives in Git (backend/content) and reaches the database at deploy time.
interface ContentSource
{
    /**
     * @throws InvalidContent with every problem found at once
     */
    public function read(): Content;
}
