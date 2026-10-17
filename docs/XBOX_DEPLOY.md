# Xbox Dev Mode deployment

Project Zero's launcher is an x64 UWP application. Build and test the launcher before attempting any client compatibility work.

## Build
1. Install Visual Studio with Universal Windows Platform development components and an appropriate Windows SDK.
2. Open a Developer PowerShell.
3. Run `scripts/build-xbox.ps1` from the repository root.
4. Create a signed x64 app package from the UWP project for sideload testing.

## Console test
1. Put the Xbox in Developer Mode and sign in to a user on the console.
2. Pair/deploy with Visual Studio or upload the signed package and dependencies using Xbox Device Portal.
3. Launch Project Zero from Dev Home.
4. Confirm the launcher renders at TV-safe scale, obtains a device code, displays the verification URL, polls without blocking the UI, and transitions only after a valid Project Zero session is returned.

## Logs to retain
Record the exact deployment error code, exception text, HTTP status and launcher state. Do not replace failures with generic messages during development.

## Client compatibility gate
The archived client is not embedded in this repository. Run `scripts/prepare-client-audit.ps1 -ClientRoot <local-authorized-build>` on a PC first. Any unsupported imported APIs/native dependencies identified by that audit become explicit compatibility tasks. Packaging a desktop executable by itself does not convert it into an Xbox-compatible UWP executable.
