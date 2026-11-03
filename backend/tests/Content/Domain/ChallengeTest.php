<?php

declare(strict_types=1);

namespace App\Tests\Content\Domain;

use App\Content\Domain\Demand;
use App\Tests\Content\Content;
use PHPUnit\Framework\TestCase;

final class ChallengeTest extends TestCase
{
    // §21.4: a reviewed text of its own and a reason to exist, or no index.
    public function testIsIndexedOnlyWithAReviewedTextAndADemand(): void
    {
        self::assertTrue(Content::challenge('100-push-ups')->indexable());
        self::assertTrue(Content::challenge('100-push-ups', demand: Demand::Navigation)->indexable());
        self::assertFalse(Content::challenge('100-push-ups', demand: Demand::Unverified)->indexable());
        self::assertFalse(Content::challenge('100-push-ups', reviewed: false)->indexable());
        self::assertFalse(Content::challenge('100-push-ups', note: " \n")->indexable());
    }

    public function testLivesAtAnAddressOfLowercaseWords(): void
    {
        $this->expectExceptionMessage('"100 Push-Ups" is not a slug.');

        Content::challenge('100 Push-Ups');
    }
}
