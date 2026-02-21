# Testing Strategy

## Goals

1. Fast feedback for core UI behavior during development.
2. Regression protection as IndexedDB and business logic are added.
3. Clear split between unit/integration tests and manual device checks.

## Tooling

1. `Vitest` as the test runner.
2. `@testing-library/react` for component and page behavior.
3. `@testing-library/jest-dom` for readable DOM assertions.
4. `jsdom` for browser-like test environment.
5. `fake-indexeddb` for IndexedDB unit tests in Node.
6. `Playwright` for end-to-end frontend smoke tests.

## Current Coverage

1. App shell renders and tab navigation behavior (`src/App.test.tsx`).
2. Tab component active-state and click callback behavior (`src/components/TabNav.test.tsx`).
3. IndexedDB read/write harness validation (`src/db/indexeddb.test.ts`).
4. Seed process validation and idempotency checks (`src/db/seed.test.ts`).
5. Repository CRUD smoke path coverage (`src/db/repos.test.ts`).
6. Profiles page create/switch/delete behavior (`src/pages/ProfilesPage.test.tsx`).
7. Pets page create/filter/detail behavior (`src/pages/PetsPage.test.tsx`).
8. Browser-level app shell smoke tests (`tests/e2e/app-shell.spec.ts`).
9. Browser-level profile flow smoke tests (`tests/e2e/profiles.spec.ts`).
10. Browser-level pets flow smoke tests (`tests/e2e/pets.spec.ts`).

## Command Reference

1. `npm test` runs tests once.
2. `npm run test:watch` runs tests in watch mode.
3. `npm run test:coverage` generates text + HTML coverage reports.
4. `npm run test:db` runs IndexedDB-focused tests.
5. `npm run e2e:install` installs Playwright Chromium browser.
6. `npm run e2e` runs frontend smoke tests in real browser automation.
7. `npm run test:all` runs unit/integration tests then e2e tests.

## Next Test Additions (Phase 2+)

1. Repository tests for IndexedDB CRUD and seed behavior.
2. Store/inventory transaction tests (wallet deductions and quantity updates).
3. Breeding flow tests (resource consumption, breed counts, baby creation).
4. Export/import round-trip tests including photo records.
