.DEFAULT_GOAL := help
.PHONY: help up down kill logs ps sh test test-backend test-frontend lint lint-backend lint-frontend lint-infra audit audit-backend audit-frontend bundle e2e fix migrate challenges content metrics

COMPOSE := docker compose
APP := $(COMPOSE) exec -T app
NODE := $(COMPOSE) exec -T node

HADOLINT_IMAGE := hadolint/hadolint:v2.15.1-alpine@sha256:a1d49ae1a4e83c1dbad26b8c1ad7588c8bd1e04f4866b34ad3cac50335198552
ACTIONLINT_IMAGE := rhysd/actionlint:1.7.12@sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667
PLAYWRIGHT_IMAGE := mcr.microsoft.com/playwright:v1.64.1-noble@sha256:2f05f8a734509a7b3f26a912639488ee08f58a7b292d14d62271bcff9038768f

# E2E tests run the production image as a separate project, next to the development stack.
E2E_COMPOSE := APP_IMAGE=self-fighter-app:e2e APP_SECRET=e2e-secret SERVER_NAME=localhost \
	DEFAULT_URI=https://localhost SEO_INDEXING=1 MYSQL_PASSWORD=e2e MYSQL_ROOT_PASSWORD=e2e-root \
	$(COMPOSE) -p self-fighter-e2e -f compose.yaml -f compose.prod.yaml -f compose.e2e.yaml
# CI builds the image with its own cache and passes E2E_BUILD= to skip the build here.
E2E_BUILD ?= 1

help: ## Показати доступні команди
	@awk 'BEGIN {FS = ":.*## "} /^[a-z-]+:.*## / {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

up: .env ## Підняти проєкт
	$(COMPOSE) up -d --build --wait --wait-timeout 600
	@echo "Застосунок: http://localhost:$$(sed -n 's/^HTTP_PORT=//p' .env)"

down: ## Стопнути проєкт
	$(COMPOSE) stop

kill: ## Стопнути проєкт, видалити контейнери й образи
	$(COMPOSE) down --rmi all --remove-orphans

logs: ## Показати логи контейнерів
	$(COMPOSE) logs -f

ps: ## Показати стан контейнерів
	$(COMPOSE) ps

sh: ## Відкрити shell у контейнері застосунку
	$(COMPOSE) exec app bash

test: test-backend test-frontend ## Запустити всі тести

test-backend: ## Запустити тести бекенду
	$(APP) vendor/bin/phpunit

test-frontend: ## Запустити тести фронтенду
	$(NODE) npm test

lint: lint-backend lint-frontend lint-infra ## Запустити всі лінтери

lint-backend: ## Перевірити код бекенду
	$(APP) vendor/bin/php-cs-fixer check
	$(APP) vendor/bin/phpstan analyse --no-progress
	$(APP) vendor/bin/deptrac analyse --no-progress
	$(APP) php bin/console lint:twig templates
	$(APP) php bin/console lint:yaml config translations --parse-tags
	$(APP) php bin/console lint:container
	$(APP) php bin/console debug:translation uk --only-missing
	$(APP) php bin/console doctrine:schema:validate --skip-sync
	$(APP) php bin/console app:content:lint

lint-frontend: ## Перевірити код фронтенду
	$(NODE) npm run lint
	$(NODE) npm run typecheck

lint-infra: ## Перевірити Dockerfile і workflow GitHub Actions
	docker run --rm -i $(HADOLINT_IMAGE) hadolint - < Dockerfile
	docker run --rm -v "$(CURDIR):/repo:ro" -w /repo $(ACTIONLINT_IMAGE)

audit: audit-backend audit-frontend ## Перевірити залежності на вразливості

audit-backend: ## Перевірити залежності бекенду
	$(APP) composer audit

audit-frontend: ## Перевірити залежності фронтенду
	$(NODE) npm audit --audit-level=high

bundle: ## Перевірити бюджет розміру JS
	$(NODE) npm run check:bundle

e2e: ## Запустити E2E-тести на prod-образі в Playwright
	$(if $(E2E_BUILD),$(E2E_COMPOSE) build app)
	$(E2E_COMPOSE) run --rm app sh -c 'php bin/console doctrine:migrations:migrate --no-interaction --all-or-nothing --allow-no-migration && php bin/console app:content:sync'
	$(E2E_COMPOSE) up -d --no-build --wait --wait-timeout 300
	docker run --rm --network container:self-fighter-e2e-app-1 -e CI -v "$(CURDIR)/e2e:/e2e" -w /e2e $(PLAYWRIGHT_IMAGE) \
		sh -c 'npm ci --no-audit --no-fund && npx playwright test'; \
		status=$$?; $(E2E_COMPOSE) down --volumes --remove-orphans; exit $$status

fix: ## Виправити стиль коду
	$(APP) vendor/bin/php-cs-fixer fix
	$(NODE) npm run lint:fix

migrate: ## Застосувати міграції
	$(APP) php bin/console doctrine:migrations:migrate --no-interaction --all-or-nothing --allow-no-migration

challenges: ## Перегенерувати готові виклики з матриці
	$(NODE) npm run challenges

content: ## Перенести контент із backend/content у базу
	$(APP) php bin/console app:content:sync

metrics: ## Показати показники §19. SINCE=2026-11-01 лишає гравців, що почали з цього дня
	$(APP) php bin/console app:metrics:report $(if $(SINCE),--since=$(SINCE))

.env:
	cp .env.example .env
