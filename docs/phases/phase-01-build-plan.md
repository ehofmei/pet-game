# Phase 01 Build Plan: Foundation and PWA Scaffold

## Implementation Tasks

1. Scaffold app:
	- `npm create vite@latest` (React + TypeScript)
	- Install dependencies and run baseline app.
2. Configure PWA:
	- Add `vite-plugin-pwa`.
	- Create manifest with app name, icons, theme colors, display mode.
	- Enable service worker auto-update.
3. Define app shell:
	- Create tab navigation component.
	- Add placeholder pages for all five tabs.
	- Add active tab routing/state handling.
4. Create project layout:
	- Add folders for models, db, pages, components, utils.
	- Add minimal barrel/export files where helpful.
5. Apply baseline styling:
	- Mobile-first layout suitable for iPad portrait/landscape.
	- Touch-friendly controls with clear tap targets.

## Verification

1. Run `npm run dev` and open app on desktop browser.
2. Run `npm run build` and confirm no TypeScript errors.
3. Validate manifest/service worker registration in browser devtools.
4. On iPad Safari:
	- Open app URL.
	- Add to Home Screen.
	- Relaunch installed app offline.

## Definition of Done

1. All phase tasks complete and committed.
2. No console errors in normal navigation.
3. PWA install/offline shell behavior confirmed manually.
