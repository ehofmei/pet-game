# Error Diagnostics

This document explains the local diagnostics feature used to troubleshoot generic in-app errors.

## Where To Find It

1. Open `Admin` tab.
2. Scroll to `Diagnostics: Recent Errors`.

## What Gets Logged

1. Caught errors from app flows (for example: pet create/update/delete failures).
2. Unhandled browser errors (`window.error`).
3. Unhandled promise rejections (`window.unhandledrejection`).

Each entry stores:

1. Timestamp
2. Source (`caught`, `unhandledError`, `unhandledRejection`)
3. Context label (where the failure occurred)
4. Message and optional error type
5. Optional metadata
6. Optional stack trace

## Storage Details

1. Stored locally in browser localStorage key: `pet-breeder-cards.error-log`.
2. Newest entries are first.
3. History is capped (rolling window).
4. Data remains on-device only.

## Recommended Troubleshooting Flow

1. Reproduce the issue.
2. Open `Admin` -> `Diagnostics: Recent Errors`.
3. Copy the most recent entry details and stack trace.
4. Clear the log before testing a fix to reduce noise.
