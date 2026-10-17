# Season 7 v7.00 runtime import audit

Static audit of the user-supplied authorized `FortniteClient-Win64-Shipping.exe` for CL-4629139. No game binary is stored in this repository.

Reference SHA-256: `e2292cd7d039a5c8e3386d508be680c5ab626c6407282727bca098396e77ea75`

The executable imports 45 DLL families. The largest desktop-facing groups are:

| Imported DLL | Imports | Project Zero handling |
| --- | ---: | --- |
| KERNEL32.dll | 206 | retargeted to `UWKRNL32.dll`; clean-room implementation required |
| USER32.dll | 105 | retargeted to `UWPU32.dll`; window/input adaptation required |
| MSVCP140.dll | 59 | package compatible VC runtime |
| WS2_32.dll | 45 | networking compatibility review required |
| WINMM.dll | 30 | retargeted to `UWPMM.dll`; timing/audio/MIDI adaptation required |
| VCRUNTIME140.dll | 26 | package compatible VC runtime |
| GDI32.dll | 24 | graphics/window compatibility review required |
| ADVAPI32.dll | 20 | retargeted to `UWADVAPI.dll`; registry/event behavior must be adapted |
| WLDAP32.dll | 16 | service-dependent; must not be blindly stubbed into success |
| ole32.dll | 14 | retargeted to `uwole.dll`; COM adaptation required |
| IMM32.dll | 12 | retargeted to `UWIMM.dll`; input method adaptation required |
| dbghelp.dll | 12 | diagnostics compatibility review required |
| HID.DLL | 12 | device/input adaptation required |
| SETUPAPI.dll | 11 | retargeted to `UWSETUP.dll`; device enumeration adaptation required |

Additional graphics/audio imports include `d3d11.dll`, `dxgi.dll`, `d3d9.dll`, `OPENGL32.dll`, `DSOUND.dll`, `X3DAudio1_7.dll`, `XAPOFX1_5.dll`, and `XINPUT1_3.dll`.

## Current converter coverage

`tools/convert-season7-client.py` structurally retargets these desktop DLL families to Project Zero-owned compatibility DLL names:

- `KERNEL32.dll -> UWKRNL32.dll`
- `USER32.dll -> UWPU32.dll`
- `WINMM.dll -> UWPMM.dll`
- `ADVAPI32.dll -> UWADVAPI.dll`
- `SHELL32.dll -> UWSHL32.dll`
- `ole32.dll -> uwole.dll`
- `SETUPAPI.dll -> UWSETUP.dll`
- `dwmapi.dll -> uwdwm.dll`
- `IMM32.dll -> UWIMM.dll`
- `XINPUT1_3.dll -> UWXIN13.dll`
- `d3d9.dll -> ud39.dll`
- `OPENGL32.dll -> UWPGL32.dll`
- `DSOUND.dll -> UWSND.dll`
- `VERSION.dll -> UWVER.dll`

This mirrors only an externally observable compatibility architecture. No third-party compatibility DLLs are copied.

## Runtime rule

A compatibility function must either map to an API that is valid in Xbox UWP/AppContainer, provide an explicit Project Zero implementation, or fail honestly. Project Zero must not bypass AppContainer security, anti-cheat, DRM, encrypted content, or retail service authentication.

The next runtime milestone is loader resolution: produce Project Zero-owned compatibility DLLs for the exact imported symbols needed during startup until `FortniteClient-Win64-Shipping.dll` reaches its first supported engine initialization stage. Hardware failures then drive the next clean-room implementation increment.
