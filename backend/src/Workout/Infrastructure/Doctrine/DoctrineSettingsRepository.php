<?php

declare(strict_types=1);

namespace App\Workout\Infrastructure\Doctrine;

use App\Shared\Domain\UserId;
use App\Shared\Infrastructure\Doctrine\UserIdType;
use App\Workout\Domain\Settings;
use App\Workout\Domain\SettingsRepository;
use Doctrine\ORM\EntityManagerInterface;

final readonly class DoctrineSettingsRepository implements SettingsRepository
{
    public function __construct(private EntityManagerInterface $entityManager)
    {
    }

    public function add(Settings $settings): void
    {
        $this->entityManager->persist($settings);
    }

    public function find(UserId $owner): ?Settings
    {
        return $this->entityManager->find(Settings::class, $owner);
    }

    public function remove(UserId $owner): void
    {
        $this->entityManager
            ->createQuery('DELETE FROM App\Workout\Domain\Settings s WHERE s.owner = :owner')
            ->setParameter('owner', $owner, UserIdType::NAME)
            ->execute();
    }
}
