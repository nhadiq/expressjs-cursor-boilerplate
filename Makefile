MAKEFLAGS += --no-print-directory
.SHELLFLAGS := -eu -o pipefail -c

.PHONY: help lint lint-fix format format-check typecheck security-audit \
        test test-ci test-integration check pre-push ci fix pre-commit

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

lint: ## ESLint
	pnpm lint

lint-fix: ## ESLint with auto-fix
	pnpm lint:fix

format: ## Prettier write
	pnpm exec prettier --write .

format-check: ## Prettier check
	pnpm exec prettier --check .

fix: lint-fix format ## Auto-fix lint + format

typecheck: ## TypeScript --noEmit
	pnpm typecheck

security-audit: ## Dependency vulnerability scan
	pnpm audit --audit-level=high

test: ## Vitest watch mode
	pnpm test

test-ci: ## Vitest single run
	pnpm test:ci

test-integration: ## Integration tests (Supertest)
	pnpm test:integration

pre-commit: ## What .husky/pre-commit runs
	pnpm lint-staged

check: lint format-check typecheck security-audit test-ci ## Core quality gate
	@echo "✓ make check passed"

pre-push: check test-integration ## .husky/pre-push — MUST pass or push is blocked
	@echo "✓ make pre-push passed — push allowed"

ci: pre-push ## GitHub Actions — identical to pre-push gate
	@echo "✓ make ci passed"
