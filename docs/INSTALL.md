# Install Project Zero on an Xbox

Everything below runs on retail Xbox hardware in Developer Mode. No hardware modification, no devkit.

## 1. Enable Developer Mode

1. Install the Xbox Dev Mode activation app from the Microsoft Store on the console.
2. Open it, copy the activation code, register at `https://partner.microsoft.com/dashboard/registration/xbox`.
3. Microsoft issues a Dev Mode account. Sign in on the console with it.
4. The console reboots into Dev Mode. Enable **Settings → System → Developer settings → Developer Mode** and
   note the console IP address.
5. In Dev Mode, open **Settings → System → Developer settings → Manage developer settings** to reach Xbox
   Device Portal (`https://<console-ip>:11443`).

## 2. Trust the signing certificate

Every CI build ships its own self-signed certificate inside the artifact folder, next to the bundle. Use the
`ProjectZero.cer` from the same download as the `.msixbundle`. A `.cer` from a different build will not
validate this bundle.

1. Copy `ProjectZero.cer` to a PC on the same network.
2. Open `certlm.msc` → **Trusted People** → **Certificates** → **Import** → select the `.cer`.
3. Open **Trusted Root Certification Authorities** → **Certificates** → import the same file.
4. Alternatively use Device Portal → **System → Certificates** to install it on the console directly.

Without the certificate in *Trusted People* on the console, Dev Mode rejects the package with
`0x800B0109` (certificate chain not trusted). That is the expected failure mode, not a corrupt build.

## 3. Sideload the launcher

If the release includes `Microsoft.NET.CoreRuntime.2.2.appx`, install that dependency first. Consoles that
already ship the .NET Core UWP runtime can skip it.

```powershell
# From Device Portal the easy way: Apps → Package manager → upload the .msixbundle
# From PowerShell with the console exposed:
Add-AppxPackage -Path .\ProjectZero_1.0.0.0_x64.msixbundle -ForceUpdateFromAnyVersion
```

Dev Mode consoles accept package installation over the network without a Store. Retail (non-Dev) consoles
will refuse the package outright.

## 4. First run

1. Launch **Project Zero** from the Dev Mode app list.
2. The screen shows a 6-character code and a QR.
3. Open `https://project-zero-delta.vercel.app/link` on any device.
4. Enter the code, then an email and username. That account becomes the console identity.
5. The launcher picks the claim up within 2.5 seconds, mints a ticket and hands off.

## 5. Account state

Accounts live in the Project Zero control plane, not Epic. Nothing is created on Epic infrastructure. The
website session is stored in browser local storage under `pz_token`.

To move a console to a different account: Handoff screen → **Unlink console**, then link again.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `0x800B0109` on install | certificate not trusted | steps in section 2 |
| `CONTROL PLANE UNREACHABLE` | console has no outbound HTTPS | check network; Dev Mode consoles need internet |
| `CODE EXPIRED` | 15-minute window passed | press A / Refresh code |
| `CLIENT PACKAGE NOT INSTALLED` | no UWP game client with the protocol registered | build and install the client package |
| QR blank | `apiBase` override points at a dead host | clear the override in launcher LocalSettings |
