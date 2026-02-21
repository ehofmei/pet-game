# Phase 06 Build Plan: Breeding Flow and Event History

## Implementation Tasks

1. Build Breed page UI:
	- Parent selectors with search/filter.
	- Cross-species toggle in settings state.
	- Breed action button with validation status.
2. Implement breeding service transaction:
	- Validate two distinct parents.
	- Validate species rule when toggle disallows cross-species.
	- Determine breeding session source:
		- Use existing inventory token if available.
		- Else prompt and optionally buy/use via coin deduction.
	- Increment parents and create baby.
	- Write `BreedingEvent` and `TransactionLog`.
3. Build post-breeding success state:
	- Show baby summary.
	- Add action to open baby pet edit page for photo capture.
4. Integrate event history:
	- Show breeding events in pet detail view.

## Verification

1. Breed with token in inventory.
2. Breed with coin fallback when token absent.
3. Confirm parent counts increment exactly once.
4. Confirm baby defaults are correct for same and mixed species.
5. Confirm event and transaction records created.

## Definition of Done

1. Breeding flow is complete and deterministic.
2. Resource consumption and logs are correct.
3. User can move directly to baby photo capture/edit after success.
