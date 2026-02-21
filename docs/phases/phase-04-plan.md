# Phase 04 Plan: Pets Tab and Photo Capture Flow

## Goal

Deliver complete pet management with iPad camera capture, pet list filtering, and pet detail editing/history.

## Scope

1. Pets list/grid with thumbnails per active profile.
2. Search and filters:
	- species
	- gender
	- wasWild
	- tags
3. Add Pet flow with form and photo capture/upload.
4. Photo storage as Blob in IndexedDB (Photo table + `photoId` references).
5. Pet detail page:
	- Full photo
	- Editable fields
	- Manual breedCount adjustment
	- Related breeding history entries

## Non-Goals

1. Breeding action logic itself (Phase 06).

## Dependencies

1. Phase 02 data layer.
2. Phase 03 active profile context.

## Deliverables

1. End-to-end pet CRUD with local persistence.
2. Working image capture/input flow compatible with iPad Safari.
3. User-friendly pet browsing/filtering.

## Exit Criteria

1. Can add pet with camera photo and form values.
2. Pets and photos persist across refresh/offline.
3. Filters return expected subsets.
