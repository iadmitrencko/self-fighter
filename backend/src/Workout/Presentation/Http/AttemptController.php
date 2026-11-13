<?php

declare(strict_types=1);

namespace App\Workout\Presentation\Http;

use App\Shared\Domain\Instant;
use App\Shared\Domain\UserId;
use App\Shared\Presentation\Http\ApiProblem;
use App\Shared\Presentation\Http\Json;
use App\Shared\Presentation\Http\JsonBody;
use App\Workout\Application\AttemptHistory;
use App\Workout\Application\SaveAttempt;
use App\Workout\Application\Tally;
use App\Workout\Domain\Attempt;
use App\Workout\Domain\AttemptFilter;
use App\Workout\Domain\AttemptId;
use App\Workout\Domain\Mode;
use App\Workout\Domain\Outcome;
use Symfony\Component\HttpFoundation\InputBag;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;

/**
 * The history (§14), its statistics and the record of the game (§24).
 */
final readonly class AttemptController
{
    // An attempt of 20 rounds with 20 exercises takes about 100 KB.
    private const int MAX_BYTES = 512 * 1024;
    private const int PAGE_SIZE = 20;
    private const int PAGE_SIZE_MAX = 100;

    public function __construct(
        private AttemptHistory $history,
        private SaveAttempt $saveAttempt,
    ) {
    }

    #[Route('/api/v1/attempts', name: 'api_attempts', methods: ['GET'])]
    public function list(Request $request, UserId $user): JsonResponse
    {
        $limit = self::option($request->query, 'limit', static fn (string $value): ?int => filter_var(
            $value,
            \FILTER_VALIDATE_INT,
            ['options' => ['min_range' => 1, 'max_range' => self::PAGE_SIZE_MAX], 'flags' => \FILTER_NULL_ON_FAILURE],
        )) ?? self::PAGE_SIZE;
        // The cursor is the last attempt of the previous page.
        $after = self::option($request->query, 'cursor', function (string $value) use ($user): ?Attempt {
            $id = AttemptId::tryFrom($value);

            return null === $id ? null : $this->history->find($user, $id);
        });
        $page = $this->history->page($user, self::filter($request->query), $limit, $after);

        return Json::response([
            'items' => array_map(static fn (Attempt $attempt): array => $attempt->document(), $page->attempts),
            'nextCursor' => $page->last?->id()->value,
        ]);
    }

    #[Route('/api/v1/attempts/{id}', name: 'api_attempt', methods: ['GET'], requirements: ['id' => Requirement::UUID_V7])]
    public function show(string $id, UserId $user): JsonResponse
    {
        $attempt = $this->history->find($user, AttemptId::fromString($id))
            ?? throw new ApiProblem(Response::HTTP_NOT_FOUND, 'not-found');

        return Json::response($attempt->document());
    }

    #[Route('/api/v1/attempts/{id}', name: 'api_attempt_save', methods: ['PUT'], requirements: ['id' => Requirement::UUID_V7])]
    public function save(string $id, Request $request, UserId $user): Response
    {
        $created = ($this->saveAttempt)($user, AttemptId::fromString($id), JsonBody::read($request, self::MAX_BYTES));

        return new Response(null, $created ? Response::HTTP_CREATED : Response::HTTP_NO_CONTENT);
    }

    #[Route('/api/v1/stats', name: 'api_stats', methods: ['GET'])]
    public function stats(Request $request, UserId $user): JsonResponse
    {
        $statistics = $this->history->statistics($user, self::filter($request->query));

        return Json::response([
            'total' => $statistics->total,
            'wins' => $statistics->wins,
            'draws' => $statistics->draws,
            'losses' => $statistics->losses,
        ]);
    }

    #[Route('/api/v1/game', name: 'api_game', methods: ['GET'])]
    public function game(UserId $user): JsonResponse
    {
        $record = $this->history->game($user);
        $tally = static fn (Tally $tally): array => ['wins' => $tally->wins, 'draws' => $tally->draws, 'losses' => $tally->losses];

        return Json::response([
            'fights' => $tally($record->fights),
            'campaign' => $tally($record->campaign),
            'passed' => $record->passed,
            'energy' => array_map(static fn (?\DateTimeImmutable $time): ?string => null === $time ? null : Instant::format($time), $record->energy),
            // Objects even when empty, as the browser expects them.
            'best' => (object) $record->best,
            'duel' => (object) $record->duel,
            'duelAt' => null === $record->duelAt ? null : Instant::format($record->duelAt),
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
