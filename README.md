# The Pet Game

Offline-first, installable PWA for tracking a kid-made pet breeding card game.

## Current Status

Phases 01-06 are implemented:

1. React + TypeScript + Vite scaffold
2. PWA manifest and service worker via `vite-plugin-pwa`
3. Responsive app shell with six tabs (`Pets`, `Breed`, `Store`, `Inventory`, `Profiles`, `Admin`)
4. Pets CRUD with local photos and filtering
5. Store purchasing and wallet/inventory updates with transaction logs
6. Profiles management with separate Admin tools tab
7. In-app diagnostics panel for recent detailed error logs
8. Breeding workflow with token/coin consumption fallback, baby creation, and event logging

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Tests

```bash
npm test
npm run test:watch
npm run test:coverage
npm run e2e:install
npm run e2e
```

## iPad Install (Safari)

1. Open the app URL in Safari.
2. Tap Share.
3. Tap `Add to Home Screen`.
4. Launch from Home Screen.

After first load, the app shell is cached for offline use.

## Deploy To GitHub Pages

1. Full first-time deploy guide: `docs/deploy-github-pages.md`
2. A ready workflow is included at `.github/workflows/deploy-pages.yml`
3. In GitHub, set `Settings` -> `Pages` -> `Source` to `GitHub Actions`

## Documentation

1. Tech stack cheat sheet: `docs/tech-stack-cheat-sheet.md`
2. App usage guide: `docs/app-user-guide.md`
3. Data model reference: `docs/data-model-reference.md`
4. Error diagnostics: `docs/error-diagnostics.md`
5. Testing strategy: `docs/testing-strategy.md`
6. Phase plans: `docs/phases/`

## Project Plans

Phase-by-phase planning docs are in `docs/phases/`.
