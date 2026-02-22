# The Pet Game App User Guide

This is a living user guide for using the app as a player/parent on one device.

## What This App Does

1. Tracks pet card entries and photos.
2. Supports multiple local profiles (each with isolated data).
3. Stores everything locally on-device.
4. Works offline after initial load.

## Tabs Overview

1. `Pets`
Add, view, edit, filter, and manage pets.

2. `Breed`
Select two parent pets, choose child count, and create baby pets.

3. `Store`
Browse and buy pets, supplies, and Breeding Cards.

4. `Inventory`
View inventory, wallet balances, and transaction history.

5. `Profiles`
Create/switch/rename/delete profiles.

6. `Admin`
Manage wallet adjustments, store catalog items, and diagnostics.

## First-Time Setup

1. Open the app in Safari (iPad) or browser (desktop).
2. Wait for initial load to complete.
3. In `Profiles`, verify default profile `Family` exists.
4. Optionally create additional profiles.

## Using Profiles

1. Open `Profiles` tab.
2. Add a profile:
	- Enter name in `New profile name`.
	- Tap `Add Profile`.
3. Switch active profile:
	- Tap `Make Active` on desired profile.
4. Rename profile:
	- Edit rename field.
	- Tap `Save Name`.
5. Delete profile:
	- Tap `Delete`.
	- Confirm dialog.
6. Export backup:
	- Tap `Export Data`.
	- Save the downloaded `.json` file somewhere safe.
7. Import backup:
	- Tap `Import Data`.
	- Pick a backup `.json` file.
	- Confirm overwrite warning.
8. Guardrail:
	- You cannot delete the last remaining profile.

## Using Pets

1. Open `Pets` tab.
2. Add pet:
	- Tap `Add Pet`.
	- Fill name, species, gender, wild toggle, tags, breed count, notes.
	- Optionally add photo (camera/file).
	- Tap `Save Pet`.
3. View detail:
	- Tap `View Details` on a pet card.
4. Edit pet:
	- In detail, tap `Edit Pet`.
	- Update fields and save.
5. Delete pet:
	- In detail, tap `Delete Pet`, then confirm.
6. Adjust breed count:
	- Use `-1` / `+1` controls in detail.

## Pets Filters

In Pets list view you can filter by:

1. Search text
2. Species
3. Gender
4. Wild status
5. Tag text

## Using Store

1. Open `Store` tab.
2. Review wallet balances at top (`PetCoins` and `Coins`).
3. Filter catalog by:
	- type (`Pet`, `Item`)
	- species restriction (`cat`, `dog`, etc. or `none`)
4. Tap `Buy` on an item.
5. Results:
	- `pet` item: new pet entry is created
	- item: inventory quantity increases
	- `Extra Breed Card`: keep at least one in inventory for pets at 5+ breeds.
6. If balance is too low, purchase is blocked.

## Using Breed

1. Open `Breed` tab.
2. Optionally filter/select pets using search and species filter.
3. Select `Parent A` and `Parent B`.
4. Toggle `Allow cross-species breeding` on/off.
5. Tap `Breed Pets`.
6. Resource rules:
	- Choose 1, 2, or 3 children.
	- Each child costs 10 Coins.
	- `Special Breed` adds 5 extra Coins.
	- `Special Breed` is required for two male parents or two female parents.
	- Theme tags (for example `grass`, `hearts`) also apply Special Breed.
	- A pet can breed normally up to 5 times.
	- If either parent is at `breedCount >= 5`, an `Extra Breed Card` is required and one card is consumed from inventory.
7. Result:
	- parent `breedCount` increments by 1 for each parent
	- baby pet is created with default name/species/tags
	- breeding event and transaction log are written
8. On success, tap `Add Photo for ...` to jump directly to baby edit form.

## Using Inventory

1. Open `Inventory` tab.
2. Wallet balances are shown at top.
3. Filter inventory by:
	- item type
	- species restriction
	- tag text
4. Quick quantity adjustments:
	- tap `-1` or `+1`
	- confirm prompt
	- enter required reason
5. `Recent Transactions` shows newest wallet/item changes.

## Admin Tools

1. Open `Admin` tab.
2. Wallet Controls:
	- add/remove `PetCoins` and `Coins`
	- provide required reason for each change
3. Store Item Manager:
	- choose type (`Pet` or `Item`)
	- set name/description
	- choose `Species` for pets, or `Species Restriction` for items
	- set one price field (PetCoins for pets, Coins for items)
	- set optional tags and optional image
	- add, edit, or delete store items
4. Tap `Add Store Item` (or `Save Store Item` when editing).
5. Item is saved locally and appears in Store.

## Diagnostics Error Log

1. Open `Admin` tab.
2. Scroll to `Diagnostics: Recent Errors` in the `Admin` tab.
3. This panel stores recent detailed app errors on-device, including:
	- timestamp
	- context
	- message/type
	- optional metadata
	- optional stack trace
4. Use `Clear Error Log` to remove stored entries.
5. Use this panel when a generic message appears (example: `Failed to create pet.`).

## iPad Camera Notes

1. Photo input uses `accept="image/*"` and `capture="environment"`.
2. On iPad Safari, this can open camera or photo picker depending on permissions and iOS behavior.
3. If camera does not open directly, choose `Take Photo` from picker.

## Offline Behavior

1. First load must be online.
2. After caching completes, app shell works offline.
3. Existing locally stored data remains accessible offline.
4. New data created offline is saved locally.

## Installing To Home Screen (iPad)

1. Open app URL in Safari.
2. Tap `Share`.
3. Tap `Add to Home Screen`.
4. Launch installed icon.

## Known Scope (Current Build)

1. No cloud sync; data is per-device.
2. No user authentication.

## Troubleshooting

1. App shows old UI:
	- Open URL in Safari while online, then relaunch home screen app.
2. Missing data:
	- Confirm you are on the expected active profile.
3. Camera/photo issues:
	- Check iPad camera/photo permissions for Safari.
4. Generic errors (example: `Failed to create pet`):
	- Open `Admin` -> `Diagnostics: Recent Errors` to see details.
5. Blank page after deploy:
	- Wait for GitHub Pages workflow to finish and reload.
6. Reinstall / icon refresh risk on iOS:
	- Always run `Export Data` first.
	- If data is lost, use `Import Data` with your saved backup file.
