<?php

declare(strict_types=1);

namespace App\Api;

use App\Entity\Attempt;
use App\Entity\Mode;
use App\Entity\Outcome;
use App\Entity\User;
use App\Repository\AttemptFilter;
use App\Repository\AttemptRepository;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\InputBag;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Uid\Uuid;

/**
 * The history (§14) and its statistics.
 */
final readonly class AttemptController
{
    // An attempt of 20 rounds with 20 exercises takes about 100 KB.
    private const int MAX_BYTES = 512 * 1024;
    private const int PAGE_SIZE = 20;
    private const int PAGE_SIZE_MAX = 100;

    public function __construct(
        private AttemptRepository $attempts,
        private AttemptSchema $schema,
        private UserWrites $writes,
        private EntityManagerInterface $entityManager,
    ) {
    }

    #[Route('/api/v1/attempts', name: 'api_attempts', methods: ['GET'])]
    public function list(Request $request, #[CurrentUser] User $user): JsonResponse
    {
        $limit = self::option($request->query, 'limit', static fn (string $value): ?int => filter_var(
            $value,
            \FILTER_VALIDATE_INT,
            ['options' => ['min_range' => 1, 'max_range' => self::PAGE_SIZE_MAX], 'flags' => \FILTER_NULL_ON_FAILURE],
        )) ?? self::PAGE_SIZE;
        $after = self::option($request->query, 'cursor', fn (string $value): ?Attempt => Uuid::isValid($value)
            ? $this->attempts->findOneForUser($user, Uuid::fromString($value))
            : null);

        // One more than asked tells whether another page exists.
        $page = $this->attempts->findPage($user, self::filter($request->query), $limit + 1, $after);
        $items = \array_slice($page, 0, $limit);
        $last = end($items);

        return Payload::json([
            'items' => array_map(static fn (Attempt $attempt): array => $attempt->getDocument(), $items),
            'nextCursor' => \count($page) > $limit && false !== $last ? $last->getId()->toRfc4122() : null,
        ]);
    }

    #[Route('/api/v1/attempts/{id}', name: 'api_attempt', methods: ['GET'], requirements: ['id' => Requirement::UUID_V7])]
    public function show(string $id, #[CurrentUser] User $user): JsonResponse
    {
        $attempt = $this->attempts->findOneForUser($user, Uuid::fromString($id))
            ?? throw new ApiProblem(Response::HTTP_NOT_FOUND, 'not-found');

        return Payload::json($attempt->getDocument());
    }

    #[Route('/api/v1/attempts/{id}', name: 'api_attempt_save', methods: ['PUT'], requirements: ['id' => Requirement::UUID_V7])]
    public function save(string $id, Request $request, #[CurrentUser] User $user): Response
    {
        $body = JsonBody::read($request, self::MAX_BYTES);
        $document = $body->toArray();
        $result = $document['result'] ?? null;
        $outcome = Outcome::tryFrom(\is_array($result) && \is_string($result['outcome'] ?? null) ? $result['outcome'] : '');
        $finishedAt = \is_string($document['finishedAt'] ?? null) ? Instant::parse($document['finishedAt']) : null;

        if (!$this->schema->isAttempt($body->data) || $document['id'] !== $id || null === $outcome || null === $finishedAt) {
            throw new ApiProblem(Response::HTTP_UNPROCESSABLE_ENTITY, 'invalid-attempt');
        }

        $attempt = new Attempt(
            Uuid::fromString($id),
            $user,
            Mode::from((string) $document['mode']),
            $outcome,
            (int) $document['schemaVersion'],
            $finishedAt,
            $document,
        );

        try {
            return $this->writes->run($user, function () use ($attempt, $user, $document): Response {
                $saved = $this->attempts->find($attempt->getId());

                if (null === $saved) {
                    $this->entityManager->persist($attempt);

                    return new Response(null, Response::HTTP_CREATED);
                }

                // Sending the same attempt again changes nothing, anything else under its id is refused (§17.2).
                if (!$saved->belongsTo($user) || !$saved->hasDocument($document)) {
                    throw new ApiProblem(Response::HTTP_CONFLICT, 'conflict');
                }

                return new Response(null, Response::HTTP_NO_CONTENT);
            });
        } catch (UniqueConstraintViolationException) {
            // Another user saved an attempt with this id at the same moment.
            throw new ApiProblem(Response::HTTP_CONFLICT, 'conflict');
        }
    }

    #[Route('/api/v1/stats', name: 'api_stats', methods: ['GET'])]
    public function stats(Request $request, #[CurrentUser] User $user): JsonResponse
    {
        $counts = $this->attempts->countByOutcome($user, self::filter($request->query));

        return Payload::json([
            'total' => array_sum($counts),
            'wins' => $counts[Outcome::Win->value],
            'draws' => $counts[Outcome::Draw->value],
            'losses' => $counts[Outcome::Loss->value],
        ]);
    }

    /**
     * @param InputBag<string> $query
     */
    private static function filter(InputBag $query): AttemptFilter
    {
        return new AttemptFilter(
            self::option($query, 'mode', Mode::tryFrom(...)),
            self::option($query, 'outcome', Outcome::tryFrom(...)),
            self::option($query, 'from', Instant::parse(...)),
            self::option($query, 'to', Instant::parse(...)),
        );
    }

    /**
     * A parameter that is absent gives null, one that cannot be read refuses the request.
     *
     * @template T
     *
     * @param InputBag<string>           $query
     * @param callable(string): (T|null) $parse
     *
     * @return T|null
     */
    private static function option(InputBag $query, string $name, callable $parse): mixed
    {
        if (!$query->has($name)) {
            return null;
        }

        // all() rather than get(): get() rejects a list such as mode[]= with a generic error of its own.
        $value = $query->all()[$name];

        return (\is_string($value) ? $parse($value) : null)
            ?? throw new ApiProblem(Response::HTTP_BAD_REQUEST, 'invalid-query');
    }
}
