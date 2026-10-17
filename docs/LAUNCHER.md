# Launcher engineering notes

`launcher/ProjectZero` is a XAML UWP app, x64, `AppContainerExe`, packaged as an appxbundle/msixbundle.

## Project layout

```
ProjectZero.csproj          UWP, TargetPlatform 19041, min 17763, bundle always, x64
Package.appxmanifest        Identity ProjectZero.Launcher, publisher CN=Project Zero, internetClient
App.xaml(.cs)               theme bootstrap, root Frame
Styles/Theme.xaml           palette, gradients, button templates, focus visuals
Controls/BrandMark.xaml     vector mark (hexagon, open C, gold pen)
Models/ApiModels.cs         DTOs for start / poll / ticket
Services/AppConfig.cs       base URL, device name, version
Services/ApiClient.cs       HttpClient, JSON via Newtonsoft
Services/SessionStore.cs    console token, username, build label
Services/GameLauncher.cs    protocol URI builder + handoff.json + LaunchUriAsync
Pages/LinkPage.xaml(.cs)    code + QR + polling loop, 2.5 s interval
Pages/HandoffPage.xaml(.cs) ticket + build resolution + handoff, retry, unlink
Properties/                  assembly info, Default.rd.xml (Newtonsoft dynamic)
```

## Build

```powershell
msbuild launcher/ProjectZero/ProjectZero.csproj `
  /t:Restore /p:Configuration=Release /p:Platform=x64 `
  /p:AppxBundle=Always /p:AppxBundlePlatforms=x64 `
  /p:UapAppxPackageBuildMode=SideloadOnly
```

Requires Visual Studio 2022 with **Universal Windows Platform development** and Windows SDK 10.0.19041
(or 10.0.22621 with retargeting). The GitHub `windows-2022` image already ships the UWP workload,
MSIX packaging tools and the SDKs, so CI needs no extra setup.

## Signing

The manifest publisher is `CN=Project Zero`, so the signing certificate must use exactly that subject.

CI generates a fresh self-signed certificate on every run, builds and signs the package with it, and copies
the matching `.cer` next to the bundle inside the artifact. Install that `.cer` on the console before
sideloading (see `docs/INSTALL.md`). A certificate from one run will not validate a bundle from another run,
which is why the `.cer` travels with the build.

`launcher/certs/ProjectZero.cer` is a stable reference certificate shipped with the repo. It is only useful
if you also hold its private key. For local builds, generate your own:

```powershell
$cert = New-SelfSignedCertificate -Type Custom -Subject "CN=Project Zero" `
  -KeyUsage DigitalSignature -FriendlyName "Project Zero" `
  -CertStoreLocation "Cert:\CurrentUser\My" `
  -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3","2.5.29.19={text}")
Export-PfxCertificate -Cert $cert -FilePath ProjectZero.pfx -Password (Read-Host -AsSecureString)
Export-Certificate -Cert $cert -FilePath ProjectZero.cer
```

MSBuild flags for a signed local bundle:

```powershell
msbuild ProjectZero.csproj /p:Configuration=Release /p:Platform=x64 `
  /p:AppxBundle=Always /p:AppxBundlePlatforms=x64 `
  /p:AppxPackageSigningEnabled=true `
  /p:PackageCertificateKeyFile="$PWD\ProjectZero.pfx" `
  /p:PackageCertificatePassword="<password>"
```

## Base URL

`Services/AppConfig.cs`:

```csharp
public const string DefaultBaseUrl = "https://project-zero-delta.vercel.app";
```

Runtime override: write a string named `apiBase` into
`ApplicationData.Current.LocalSettings.Values` (Device Portal file access → LocalState). No rebuild needed
for a staging control plane.

## Protocol contract

The launcher owns `projectzero-game://launch` and passes:

```
projectzero-game://launch
  ?ticket=<opaque, 10 min>
  &account=<username>
  &season=<6|7>
  &version=<build version>
  &cl=<changelist>
  &endpoint=<control plane origin>
```

The client package must declare this protocol in its own manifest (`uap:Protocol`) for the URI launch to
resolve. The launcher manifest intentionally does not declare it, because the game owns that handoff.

A copy of the payload is written to `ApplicationData.Current.LocalFolder\handoff.json` before launch, so the
client can read the ticket even if it was started without URI activation.

## UI register

1920×1080, dark ink `#06050A`, violet `#8B5CF6`, gold `#F2C45A`, panel `#120E1E`, line `#2A2140`, text
`#F0EBFF`. Type: Segoe UI bold display, Consolas for codes and telemetry. Focus rings use the system focus
visual with a gold secondary brush so a controller can always see where it is.

## Known constraints

- Xbox Dev Mode allocates roughly 4 GB of the console's memory to apps; the client port must fit.
- `Launcher.LaunchUriAsync` returns false when no handler exists. The page treats that as
  `CLIENT PACKAGE NOT INSTALLED`, not as an error state.
- The launcher has no matchmaking surface and no game networking. That is deliberate.
