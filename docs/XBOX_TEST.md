# Xbox Dev Mode test gate

Do not add Fortnite binaries to this repository.

## Gate A - launcher only
1. Build ProjectZero.sln as Release/x64 on Windows with the UWP workload installed.
2. Configure the API base URI in the launcher for the deployed Project Zero web service.
3. Create a signed development package from Visual Studio.
4. Install the generated package and dependency packages through Xbox Device Portal while the console is in Developer Mode.
5. Launch Project Zero. Expected result: device-link screen appears and obtains a code from the API.

Capture any deployment error code and the launcher status text exactly.

## Gate B - account link
Claim the displayed code on the web app. Expected result: Xbox polling changes from pending to linked and stores only the short-lived Project Zero launcher session.

## Gate C - client compatibility
Run `clientbridge/ImportAudit.ps1` against the locally supplied authorized Season 7.00 executable on the development PC. The script performs static import inspection only and writes `client-imports.txt`. Review each imported DLL/API against Microsoft's UWP/Xbox-supported API surface before attempting a console package.

The client is not considered Xbox-compatible until these gates pass on hardware.
