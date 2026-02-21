# Phase 04 Build Plan: Pets Tab and Photo Capture Flow

## Implementation Tasks

1. Create Pets page components:
	- Pet list/grid view
	- Filter/search toolbar
	- Add/Edit pet form
2. Implement photo pipeline:
	- Use `<input type="file" accept="image/*" capture="environment">`
	- Save Blob to `Photo` table
	- Save `photoId` on `Pet`
3. Implement Pet CRUD:
	- Create with initial fields and breedCount default.
	- Update and delete operations.
	- Tag parsing from comma-separated input.
4. Build Pet detail view:
	- Show large image preview.
	- Editable metadata.
	- BreedCount manual adjust controls.
	- Breeding history query by pet id.

## Verification

1. Add pets with and without photos.
2. Edit pets and verify `updatedAt` changes.
3. Reload app offline and verify records/images remain.
4. Validate filters for species/gender/wasWild/tag combinations.

## Definition of Done

1. Pets tab fully functional for MVP use.
2. iPad camera capture path tested.
3. Data integrity preserved between Pet and Photo records.
