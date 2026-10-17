# Season 6 / 7 client package for Dev Mode

This document covers the second binary: the game client itself, rebuilt as a UWP package. It is not in this
repository. What follows is the engineering map so the port is a build task, not a research project.

## Why the PC archive does not run on Xbox

The archive at `github.com/llamaqwerty/fortnite-builds-archive` holds Windows PC client distributions
(4.x/6.x/7.x, UE4). Xbox Dev Mode runs **UWP AppContainer** packages. A PC Win32 executable cannot be
installed on an Xbox at all, regardless of signing. The three gaps:

1. **Package model.** Win32 `.exe` + loose files vs. MSIX/APPX with an appxmanifest, virtualized file system,
   and declared capabilities.
2. **API surface.** AppContainer blocks arbitrary file system writes, process creation outside the package,
   and raw sockets. UE4's Win32 platform layer (D3D11 swapchain, raw input, file I/O via Win32) needs the
   UWP platform layer instead.
3. **Anti-cheat and online services.** The retail client's EAC and Epic online subsystems require services
   that do not exist in this deployment. For a lobby-only build both are stubbed out, not emulated.

## Shape of the port

UE4 has shipped UWP support historically (`Platforms/UWP` in 4.13–4.27 era sources). The port is:

1. Add/recover `Engine/Source/Runtime/.../UWP` platform layer: D3D11 UWP swapchain, XInput/UWP gamepad
   input, `ApplicationData` file I/O, async task graph on UWP threads.
2. Retarget the project: `Target.cs` with `UWP` platform, x64 only, packaged output.
3. Replace online subsystem: a local `OnlineSubsystemProjectZero` implementing the interfaces the front end
   touches (identity, presence, store catalog, party) against the Project Zero control plane. Lobby-only
   means no matchmaking, no sessions, no dedicated server registration.
4. Strip EAC bootstrapping and the retail service handshake; the client runs offline against local services.
5. Front-end data: the original lobby, shop and menus ship inside the build's paks. They load from the
   package's content directory as-is. Nothing is recreated or redrawn.
6. Package: appxmanifest with `uap:Protocol Name="projectzero-game"`, `internetClient`, x64, splash and tiles
   from the same asset set as the launcher.
7. Sign with the same Project Zero certificate; install next to the launcher.

Steps 1–2 are the heavy lift (weeks of engine work, not a script). Steps 3–7 are the part this repo's
contract is built for: the launcher already passes account, build and ticket, and the control plane already
mints tickets.

## Session handoff the client should implement

```
projectzero-game://launch?ticket=…&account=…&season=…&version=…&cl=…&endpoint=…
```

On activation:

1. Parse the URI, read `ticket` and `endpoint`.
2. `POST <endpoint>/api/game/session` with `{ ticket }` (route reserved) to exchange the ticket for a session
   descriptor: account id, display name, entitlements, and the local service endpoints.
3. Mount the profile, load the front end from paks, run lobby only.

`handoff.json` in the launcher's LocalFolder carries the same payload for cold starts.

## Legal and distribution reality

The client binary is the property of Epic Games; the archive is third-party. Project Zero does not host or
redistribute builds. Keep the port private, keep the archives on their existing mirrors, and treat this as
preservation work on hardware the operator owns. That is also why the registry links out instead of caching.

## What is needed to finish

- An Unreal Engine 4 source license (Epic requires a paid/registered account to access 4.x source).
- The specific build's PC archive as reference for content and front-end assets.
- A Windows workstation or CI runner with the UWP toolchain, plus a Dev Mode console for validation.
- Iteration on the UWP RHI until the lobby frame budget holds at 1080p (Dev Mode has ~4 GB usable).

Until that exists, the launcher's handoff screen is the honest end state.
