# Project Zero status

## Implemented in repository
- Project Zero project specification and proprietary-binary exclusions.
- Supabase schema for profiles, one-time device links and launcher sessions.
- Server-only cryptographic helpers; service-role credentials stay off Xbox/browser clients.
- `/api/device/start`, `/api/device/status`, `/api/device/claim` device authorization flow.
- Initial web device-code UI.
- Xbox x64 UWP manifest and device-link XAML screen.
- Xbox HTTP polling client and secure launcher-token storage using PasswordVault.
- Native PE compatibility probe for locally supplied authorized client files.

## Integration gates
1. Create/configure Supabase project and apply `backend/supabase/schema.sql`.
2. Deploy `web/` and set environment variables.
3. Replace the Xbox `ApiBase` placeholder with the deployed HTTPS origin.
4. Complete Visual Studio UWP project/asset generation and produce signed x64 development package.
5. Run on Xbox Dev Mode and capture deployment/runtime logs.
6. Run `ClientProbe` against the authorized Season 7.00 executable on Windows and expand the import/dependency report.
7. Compare every required native API/dependency against Xbox UWP availability. Implement clean compatibility adapters only where the platform supports an equivalent.
8. Only after the compatibility gate passes, connect the bridge to the real client startup path.

## Explicit non-goals for milestone 1
- Matchmaking/game servers.
- Epic/Microsoft credential collection.
- DRM/anti-cheat bypasses.
- Redistribution of Fortnite/Epic binaries or assets.

The real lobby target remains experimental until the native compatibility work is proven on Xbox hardware.
