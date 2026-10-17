# Project Zero

Private Xbox Dev Mode workspace for Season 6 and Season 7 console builds. Console link, account creation,
launcher handoff, build registry. No matchmaking, no live services.

Deployed control plane: **https://project-zero-delta.vercel.app**

```
apps/web/            Next.js 14 control plane (Vercel)
launcher/ProjectZero UWP x64 launcher for Xbox Dev Mode (MSBuild / CI)
launcher/certs/      Public signing certificate (Project Zero)
supabase/migrations/ Postgres schema + build registry seed
tools/make-assets.mjs Launcher tile/splash generator (zero dependencies)
.github/workflows/   Windows CI that produces the signed MSIX bundle
docs/                Install, launcher, client-port notes
```

## What is real right now

| Piece | State |
| --- | --- |
| Website (link, account, builds, launcher preview) | built, deployed |
| Control-plane API (start / inspect / claim / poll / ticket / me) | built, deployed |
| Supabase schema + registry | applied |
| UWP launcher source | complete, built by CI |
| Launcher MSIX | produced by the `launcher` workflow on Windows |
| Season 6 / 7 UWP game client package | not built; see `docs/CLIENT-PORT.md` |
| Matchmaking | not implemented by design |

The launcher links the console, mints an account, resolves a build and issues a game ticket. It then tries
`projectzero-game://launch`. Until a signed client package that registers that protocol is installed on the
console, the handoff screen reports `CLIENT PACKAGE NOT INSTALLED` and waits. Nothing fakes a launch.

## Flow

1. Launcher boots, `POST /api/link/start`, receives a 6-character code and a poll token.
2. Code + QR render on the TV.
3. Player opens `/link` on a phone or PC, enters the code, creates the account.
4. Launcher polls `POST /api/link/poll`; the claim returns a console session token and the build list.
5. `POST /api/game/ticket` mints a 10-minute ticket for the account.
6. Launcher builds `projectzero-game://launch?ticket=…&account=…&season=…&version=…&cl=…&endpoint=…`
   and calls `Launcher.LaunchUriAsync`, writing `handoff.json` to its local folder first.

## Web app

```bash
cd apps/web
cp .env.example .env.local        # fill in Supabase keys and PZ_SECRET
npm install
npm run dev                       # http://localhost:3000
npm run build                     # production build
```

Environment:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publishable key (build registry read) |
| `SUPABASE_SERVICE_ROLE_KEY` | server routes only, never shipped to the browser |
| `PZ_SECRET` | server-side pepper for hashing session/poll tokens |
| `NEXT_PUBLIC_SITE_URL` | absolute origin used in link codes and QR payloads |

Deploy with the Vercel project `project-zero` (root directory `apps/web`). The production alias is the URL at
the top of this file. Deployments are created from the session branch through the Vercel API, not by pushing
to `main`.

## Database

Schema lives in `supabase/migrations/0001_init.sql` and is applied to project `nyfqpnjtsfjhrsjrnlhl`
(eu-west-1). All tables have RLS enabled. `anon` can read active builds and nothing else; every other table
is service-role only.

Tables: `accounts`, `devices`, `link_codes`, `sessions`, `builds`, `game_tickets`, `audit_events`.

## Launcher

```powershell
# Windows with Visual Studio 2022 + UWP workload, or use the CI artifact
cd launcher/ProjectZero
msbuild ProjectZero.csproj /p:Configuration=Release /p:Platform=x64 /p:AppxBundle=Always
```

CI: `.github/workflows/launcher.yml` runs on `windows-2022`, builds the appxbundle/msixbundle and signs it
when `PZ_SIGNING_PFX_BASE64` / `PZ_SIGNING_PFX_PASSWORD` secrets exist. Download the artifact from the
workflow run, then follow `docs/INSTALL.md`.

The control plane URL is compiled into `Services/AppConfig.cs` and can be overridden at runtime by writing a
string `apiBase` into the launcher's `LocalSettings`.

## Security model

- Link codes: 6 characters from a 32-symbol alphabet, 15-minute TTL, single claim.
- Poll tokens: 24 random bytes, hashed with SHA-256 + `PZ_SECRET` before storage.
- Console sessions: 32 random bytes, hashed, kind-scoped (`web` / `console` / `game`).
- Game tickets: 32 random bytes, hashed, 10-minute TTL, one account + one device.
- Rate limits: 30 link starts/hour/IP, 20 claims/hour/IP, enforced from the audit log.
- RLS blocks every table from the publishable key except the public build registry.

## Downloads

- Source archive: `https://github.com/zackjh66-droid/dealbot/archive/refs/heads/main.zip`
- Launcher bundle: GitHub Actions `launcher` workflow artifact, or the Releases page once a release is cut.
- Build archives: listed on `/builds`, hosted by third parties. Project Zero does not host game binaries.
