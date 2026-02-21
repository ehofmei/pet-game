# Deploy To GitHub Pages (First-Time Guide)

This guide assumes your code is already pushed to GitHub.

## 1. Confirm repo default branch

1. In GitHub, open your repo.
2. Go to `Settings` -> `Branches`.
3. Confirm default branch is `main`.

## 2. Enable GitHub Pages with Actions

1. Go to `Settings` -> `Pages`.
2. Under `Build and deployment`, set:
	- `Source`: `GitHub Actions`
3. Save.

## 3. Push and trigger deploy

1. Push your latest commit to `main`.
2. Open the `Actions` tab in GitHub.
3. Wait for workflow `Deploy To GitHub Pages` to finish green.

## 4. Find your URL

1. In `Settings` -> `Pages`, GitHub shows the site URL.
2. It will usually be:
	- Project repo: `https://<username>.github.io/<repo-name>/`
	- User site repo (`<username>.github.io`): `https://<username>.github.io/`

## 5. Install on iPad

1. Open the URL in iPad `Safari`.
2. Wait for initial load to complete.
3. Tap `Share` -> `Add to Home Screen`.
4. Launch from Home Screen.

## 6. Verify offline behavior

1. Open the installed app once while online.
2. Put iPad in Airplane Mode.
3. Reopen app from Home Screen.
4. Confirm app shell loads and existing local data is present.

## 7. Updating later

1. Push new commit to `main`.
2. Wait for deploy workflow to finish.
3. Open the app URL in Safari once to allow service worker update.
4. Reopen from Home Screen.

## Troubleshooting

1. Blank page or missing assets:
	- Wait for latest workflow run to complete.
	- Hard refresh Safari page once.
	- Confirm `Settings` -> `Pages` source is `GitHub Actions`.
2. App not installable:
	- Use iPad `Safari` (not another browser wrapper).
	- Ensure URL is `https://`.
3. Old UI after deploy:
	- Open URL in Safari once online to refresh cached assets.
