# Contributing to AutoPatch

Thank you for contributing to AutoPatch. This project follows strict production-grade software engineering standards.

## Code of Conduct & Principles
1. **Build for Trust**: Every bug detected must be verifiable, every patch backed by test evidence, and no changes are committed to production without human developer approval.
2. **No Fake Data or Stubs**: Placeholder implementations, fake statistics, or unverified claims are strictly forbidden.
3. **Demo Isolation**: Seed and fixture data resides strictly within the isolated `/demo` module and must never enter production code paths.

## Git Workflow & Branching
- Development follows `main` -> `develop` -> `feature/<name>` branches.
- Direct pushes to `main` are restricted. All changes require pull requests with all green checks.

## Conventional Commits
All commit messages must follow the Conventional Commits specification:
- `feat(<scope>): description`
- `fix(<scope>): description`
- `docs(<scope>): description`
- `test(<scope>): description`
- `refactor(<scope>): description`
- `chore(<scope>): description`

Examples:
- `feat(router): add deterministic mock provider fallback`
- `test(scanner): add regression tests for marks calculator`
- `docs(api): document patch verification endpoint`

## Verification Before Committing
Before committing or creating a pull request:
1. Run linter and formatter: `npm run lint` / `ruff check .`
2. Run type-checker: `npm run type-check` / `mypy .`
3. Run test suite: `npm test` / `pytest`
4. Confirm zero secret leaks and no `.env` files are tracked.
