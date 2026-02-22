# The Pet Game Tech Stack Cheat Sheet

This file is a quick reference for how the app is built and why each major tool exists.

## Architecture Summary

1. Frontend-only app (no backend).
2. Offline-first PWA with local database storage.
3. Installable on iPad via Safari Add to Home Screen.
4. Deployed as static files on GitHub Pages.

## Core Runtime Stack

1. `React`
Purpose: UI framework for building component-based screens.
Used for: Tabs, forms, list/detail screens, profile and pet workflows.

2. `TypeScript`
Purpose: Type safety and better refactoring confidence.
Used for: Domain models, repository APIs, page/component props, app state.

3. `Vite`
Purpose: Fast dev server and production bundling.
Used for: `npm run dev`, `npm run build`, static asset bundling.

## PWA / Offline

1. `vite-plugin-pwa`
Purpose: Generates service worker + web app manifest.
Used for: Installability and offline asset caching.

2. Service Worker (`generateSW` mode)
Purpose: Caches app shell/assets and serves them offline.
Behavior: First online load caches files; later launches can work without network.

3. Web App Manifest
Purpose: Defines app metadata for install prompts and home screen icon behavior.
Key fields: app name, icons, `start_url`, `scope`, display mode.

## Data Layer

1. `Dexie`
Purpose: IndexedDB wrapper with a cleaner API than raw browser IndexedDB.
Used for: Local persistence of profiles, pets, photos, wallet, inventory, logs.

2. `IndexedDB`
Purpose: Browser-native persistent storage.
Used for: Durable offline storage of all app state.

3. `uuid`
Purpose: Stable unique identifiers for records.
Used for: Entity IDs across profile/pet/photo and related records.

4. Domain services (`economyService`, `breedingService`, `backupService`)
Purpose: Transaction-safe business logic over multiple Dexie tables.
Used for: Store purchases, wallet/inventory adjustments, breeding flow side effects, and export/import backups.

## Error Diagnostics

1. `src/utils/errorLog.ts`
Purpose: Local rolling error log for debugging generic user-facing failures.
Used for: Capturing caught errors and unhandled browser errors/rejections.

2. Local storage key: `pet-breeder-cards.error-log`
Purpose: Persists recent diagnostics entries across reloads.
Behavior: Stores newest-first with a capped history.

3. Admin diagnostics UI
Purpose: Human-readable troubleshooting panel in app.
Used for: Viewing timestamp, context, message, metadata, and optional stack trace.

## Project Structure (High-Level)

1. `src/models`
Domain types (`Profile`, `Pet`, `StoreItem`, etc.).

2. `src/db`
Dexie schema (`database.ts`), repos, seed/bootstrap logic.

3. `src/pages`
Top-level tab pages (`Pets`, `Breed`, `Store`, `Inventory`, `Profiles`, `Admin`).

4. `src/components`
Reusable view components (`TabNav`, `PetForm`, etc.).

5. `src/context`
Cross-page state like active profile context/provider.

6. `src/utils`
Shared helpers (`ids`, `time`, `errorLog`, etc.).

## Testing Stack

1. `Vitest`
Purpose: Fast unit/integration test runner.

2. `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`
Purpose: DOM-level behavior tests for React components/pages.

3. `fake-indexeddb`
Purpose: IndexedDB simulation in tests.
Used for: DB/repository/seed tests without real browser storage.

4. `Playwright`
Purpose: End-to-end browser testing.
Used for: App shell, profile flow, pets flow, store/inventory smoke tests in Chromium.

## Deploy Stack

1. GitHub Actions
Purpose: CI build and automated Pages deployment.
Workflow: `.github/workflows/deploy-pages.yml`.

2. GitHub Pages
Purpose: Static hosting (free) for the built app.
URL shape: `https://<user>.github.io/<repo>/` for project sites.

## Key NPM Scripts

1. `npm run dev`
Starts local development server.

2. `npm run build`
Type-checks and builds production assets.

3. `npm test`
Runs unit/integration test suite.

4. `npm run e2e`
Runs Playwright end-to-end tests.

5. `npm run test:all`
Runs unit/integration tests plus E2E tests.

## Conceptual Data Flow

1. UI actions in page/components call repository methods.
2. Repositories read/write Dexie tables in IndexedDB.
3. UI refreshes from IndexedDB-backed state.
4. Service worker handles offline file delivery.
5. Errors are logged to local diagnostics for troubleshooting.

## Mental Model

1. Service worker = offline file server.
2. IndexedDB = offline database.
3. React components = user interaction layer.
4. Repositories = app data API boundary.
5. Error diagnostics = local black-box recorder for failures.
