# Phase 06 Plan: Breeding Flow and Event History

## Goal

Deliver breeding workflow that consumes breeding resources, increments parent breed counts, creates baby pet, and logs events.

## Scope

1. Breed tab:
	- Parent A and Parent B selectors with filtering.
	- Optional cross-species toggle (default allow).
2. Breeding preconditions:
	- Requires one breeding session item or coin purchase fallback.
3. Breeding transaction:
	- Increment parent breedCount by 1 each.
	- Create baby pet with defaults:
		- Name: `Baby of {A} + {B}`
		- Species: same species or `mixed`
		- Gender: `unknown` for MVP
		- Tags: union(parents) + `baby`
		- `breedCount=0`
	- Deduct inventory or wallet cost.
	- Create TransactionLog + BreedingEvent.
4. Success screen with CTA to add baby photo now.

## Non-Goals

1. Genetic simulation or advanced breeding rules.

## Dependencies

1. Pets, inventory, wallet, and transaction systems from earlier phases.

## Deliverables

1. Stable end-to-end breeding action.
2. Breeding history visible from pet detail pages.

## Exit Criteria

1. Breeding creates baby and updates both parents correctly.
2. Session item consumption/coin fallback works.
3. Logs/events persist and appear in history views.
