.DEFAULT_GOAL := help
.PHONY: help up down kill logs ps sh test lint fix migrate

COMPOSE := docker compose
APP := $(COMPOSE) exec -T app
NODE := $(COMPOSE) exec -T node

help: ## Показати доступні команди
	@awk 'BEGIN {FS = ":.*## "} /^[a-z]+:.*## / {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

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

test: ## Запустити тести
	$(APP) vendor/bin/phpunit
	$(NODE) npm test

lint: ## Перевірити код
	$(APP) vendor/bin/php-cs-fixer check
	$(APP) vendor/bin/phpstan analyse --no-progress
	$(APP) php bin/console lint:twig templates
	$(APP) php bin/console lint:yaml config
	$(APP) php bin/console lint:container
	$(APP) php bin/console doctrine:schema:validate --skip-sync
	$(NODE) npm run lint
	$(NODE) npm run typecheck

fix: ## Виправити стиль коду
	$(APP) vendor/bin/php-cs-fixer fix
	$(NODE) npm run lint:fix

migrate: ## Застосувати міграції
	$(APP) php bin/console doctrine:migrations:migrate --no-interaction --all-or-nothing --allow-no-migration

.env:
	cp .env.example .env
