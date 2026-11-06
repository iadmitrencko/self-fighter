<?php

declare(strict_types=1);

namespace App\Account\Application;

// The provider did not confirm who signs in: the browser stays as it was.
final class SignInFailed extends \RuntimeException
{
}
