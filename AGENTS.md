# Instructions

## Project Overview

Self-Fighter — вебзастосунок, який перетворює тренування на гру з цілями, раундами й віртуальним суперником.

- Вимоги: `PROJECT_SPECIFICATION.md`.
- План, архітектура й етапи: `IMPLEMENTATION_PLAN.md`.
- Макети: `design/`. Файли `*.dc.html` є еталоном структури й кольорів, вони не запускаються самостійно.

Структура:

- `backend/` — Symfony 7.4 LTS на PHP 8.5, публічні сторінки на Twig, MySQL 9.7.
- `frontend/` — React і TypeScript, збірка через Vite у `backend/public/build`.
- `docker/` — конфігурація FrankenPHP, Node і MySQL.

## Build & Run Commands

Усе працює в Docker. PHP, Composer і Node на хості не використовуються.

| Команда | Дія |
| ------- | --- |
| `make up` | Підняти проєкт. На чистому клоні нічого більше робити не треба |
| `make down` | Стопнути проєкт, контейнери й дані лишаються |
| `make kill` | Стопнути проєкт, видалити контейнери й образи. Volume MySQL лишається |
| `make test` | Запустити PHPUnit і Vitest із покриттям |
| `make lint` | Запустити PHP CS Fixer, PHPStan, перевірки Symfony, ESLint, TypeScript, hadolint і actionlint |
| `make audit` | Перевірити залежності на вразливості |
| `make bundle` | Перевірити бюджет розміру JS |
| `make fix` | Виправити стиль коду |
| `make migrate` | Застосувати міграції |
| `make logs`, `make ps`, `make sh` | Логи, стан контейнерів, shell у застосунку |

Цілі `test`, `lint` і `audit` мають варіанти `-backend` і `-frontend`, а `lint` ще й `-infra`. CI викликає ті самі цілі, тому локальна перевірка відповідає CI.

Залежності ставляться всередині контейнерів:

```sh
docker compose exec app composer require vendor/package
docker compose exec node npm install package
```

Адреси в розробці: застосунок `http://localhost:8080`, Vite на порту 5173, MySQL на `127.0.0.1:3307`. Порти змінюються в `.env`.

## Key Conventions

- Текст інтерфейсу й документи пишемо українською. Код, коментарі в коді, шляхи й слаги URL — англійською.
- Правила гри живуть лише в `frontend/src/domain`. Цей шар не залежить від React і сховища, а PHP правил гри не дублює.
- Екрани гри звертаються до даних лише через контракт сховища (розділ 3.7 плану).
- Публічні сторінки рендерить Twig. Вони не запускають сесію й не завантажують React.
- TypeScript зафіксовано на `~6.0`, бо `typescript-eslint` не підтримує 7.x. Тег MySQL задаємо явно, бо `latest` вказує на іншу гілку.
- Дії GitHub закріплюємо за повним SHA, а образи інструментів за digest. `aquasecurity/trivy-action` не використовуємо.
- На машині розробника працюють інші Docker-проєкти. Команди мають стосуватися лише проєкту `self-fighter`, тому `docker system prune` не використовуємо.
- Перед завершенням роботи запускаємо `make lint` і `make test`.
