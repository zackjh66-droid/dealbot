# Project Zero architecture

## Components

- `xbox/ProjectZero.Launcher` — Xbox Dev Mode x64 UWP launcher.
- `web` — Project Zero account/device-link website.
- `api` — device-code, account-link and launcher-session API.
- `client-bridge` — compatibility/bootstrap boundary for a locally supplied authorized client.
- `supabase` — database schema and row-level security configuration.

## Device linking

The launcher requests a device-link record and receives a human-readable one-time code plus a separate device secret. The website claims the code after authentication. The launcher polls with its secret until the link is approved. Raw launcher session tokens are not stored in the database.

## Client boundary

The repository does not contain Fortnite binaries. The bridge takes a local client path, verifies the configured build identity/hashes, records compatibility diagnostics, and only then attempts supported bootstrap operations. Desktop binaries must not be assumed to be Xbox UWP-compatible simply because they can be placed inside an MSIX.

## Initial target

Season 7.00 / CL-4629139. The first client milestone is loading/login/lobby. Matchmaking and gameplay servers are deliberately deferred.
