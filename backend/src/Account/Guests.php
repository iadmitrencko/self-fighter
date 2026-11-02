<?php

declare(strict_types=1);

namespace App\Account;

use App\Entity\Device;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Clock\ClockInterface;

final readonly class Guests
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private ClockInterface $clock,
    ) {
    }

    /**
     * Creates a guest together with the browser that will find it by the returned token.
     *
     * @return array{User, DeviceToken}
     */
    public function create(): array
    {
        $now = $this->clock->now();
        $token = DeviceToken::generate();
        $user = new User($now);

        $this->entityManager->persist($user);
        $this->entityManager->persist(new Device($user, $token->hash(), $now));
        $this->entityManager->flush();

        return [$user, $token];
    }
}
