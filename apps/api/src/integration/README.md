## API Integration Tests

These tests run against a real Postgres database through Prisma.

### Required env

- `TEST_DATABASE_URL`: isolated database URL used only for integration tests
- `JWT_SECRET`: at least 32 chars (or tests will set a default)

### Run

- `pnpm --filter api test:integration`

### Notes

- Integration suites are auto-skipped when `TEST_DATABASE_URL` is not set.
- Tests should create data with unique prefixes and clean up in `afterAll`.
