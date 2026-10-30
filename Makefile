.DEFAULT_GOAL := help
.PHONY: help up down kill logs ps sh test test-backend test-frontend lint lint-backend lint-frontend lint-infra audit audit-backend audit-frontend bundle fix migrate

COMPOSE := docker compose
APP := $(COMPOSE) exec -T app
NODE := $(COMPOSE) exec -T node

HADOLINT_IMAGE := hadolint/hadolint:v2.15.1-alpine@sha256:a1d49ae1a4e83c1dbad26b8c1ad7588c8bd1e04f4866b34ad3cac50335198552
ACTIONLINT_IMAGE := rhysd/actionlint:1.7.12@sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667

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
	$(APP) php bin/console lint:twig templates
	$(APP) php bin/console lint:yaml config
	$(APP) php bin/console lint:container
	$(APP) php bin/console doctrine:schema:validate --skip-sync

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

fix: ## Виправити стиль коду
	$(APP) vendor/bin/php-cs-fixer fix
	$(NODE) npm run lint:fix

migrate: ## Застосувати міграції
	$(APP) php bin/console doctrine:migrations:migrate --no-interaction --all-or-nothing --allow-no-migration

.env:
	cp .env.example .env
