<?php

declare(strict_types=1);

namespace App\Shared\Application;

interface Transaction
{
    /**
     * Saves every change of the callback or none of them.
     *
     * @template T
     *
     * @param callable(): T $change
     *
     * @return T
     */
    public function run(callable $change): mixed;
}
