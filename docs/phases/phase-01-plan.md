# Phase 01 Plan: Foundation and PWA Scaffold

## Goal

Create a working TypeScript + React (Vite) app that installs as a PWA and runs offline on iPad Safari.

## Scope

1. Initialize project with Vite React TypeScript template.
2. Add PWA support (manifest + service worker via Vite plugin).
3. Create base folder structure:
	- `src/db`
	- `src/models`
	- `src/pages`
	- `src/components`
	- `src/utils`
4. Build minimal tabbed shell for Pets, Breed, Store, Inventory, Profiles.
5. Add global styles with simple kid-friendly design and responsive layout.

## Non-Goals

1. No full feature logic yet (CRUD, breeding, purchases).
2. No production deployment in this phase.

## Dependencies

1. Node.js LTS and npm.
2. iPad Safari for manual install/offline checks.

## Deliverables

1. Installable PWA app shell running locally.
2. Offline caching works for app shell assets.
3. Basic navigation and placeholder pages.

## Exit Criteria

1. `npm run dev` runs without errors.
2. `npm run build` succeeds.
3. App can be installed to iPad Home Screen.
4. App shell opens while offline after first load.
