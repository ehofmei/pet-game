# Pet Breeder Cards

Offline-first, installable PWA for tracking a kid-made pet breeding card game.

## Current Status

Phase 01 is implemented:

1. React + TypeScript + Vite scaffold
2. PWA manifest and service worker via `vite-plugin-pwa`
3. Responsive app shell with five tabs (`Pets`, `Breed`, `Store`, `Inventory`, `Profiles`)
4. Required source folders initialized: `src/db`, `src/models`, `src/pages`, `src/components`, `src/utils`

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

## Project Plans

Phase-by-phase planning docs are in `docs/phases/`.
