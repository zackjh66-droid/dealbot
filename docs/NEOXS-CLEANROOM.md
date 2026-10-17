# NeoXS clean-room runtime findings

This note records only externally observable package structure from a user-supplied `NeoXS_1.0.6.4_x64.msix` so Project Zero can reproduce the *architecture* without copying NeoXS code or binaries.

## What the package actually does

The package is not simply an untouched Windows Fortnite EXE inside an MSIX.

Observed package shape:

- UWP/MSIX application entry point is a small host executable (`NeoXS.exe`).
- A prepared `FortniteClient-Win64-Shipping.dll` is bundled **inside** the MSIX.
- That client DLL exports `StartFortnite`.
- The client DLL's PE entry point is a tiny DLL initialization stub rather than the original Fortnite EXE entry point.
- `StartFortnite` jumps into the original client startup path.
- Desktop import DLL names are retargeted to compatibility shims, for example:
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
- The MSIX uses `windows.loaderSearchPathOverride` so those compatibility DLLs are found beside the client.
- The manifest declares restricted capabilities including `codeGeneration` and `broadFileSystemAccess`.
- Large Fortnite content is separate from the core MSIX. A packaged cloud manifest describes the content files and chunks.

The bundled cloud manifest identifies its data build as:

`++Fortnite+Release-10.40-CL-9380822-XboxSeries`

and lists Fortnite content such as `FortniteGame/Content/Paks/pakchunk*-WindowsClient.pak`. This is strong evidence for a two-part design: packaged executable/runtime compatibility code plus separately delivered game data.

## Relevance to Project Zero 7.00

The uploaded Season 7 `FortniteClient-Win64-Shipping.exe` has the same major desktop-import families that the observed compatibility layer retargets. Therefore Project Zero should follow this path rather than expecting Xbox to execute the untouched EXE:

1. Convert the locally supplied, authorized Season 7 client EXE into a DLL-shaped PE.
2. Preserve the original entry path behind a `StartFortnite` export.
3. Retarget unsupported desktop import DLL names to Project Zero-owned clean-room shims.
4. Package the converted DLL, UWP host, shims and required runtime DLLs **inside the MSIX**.
5. Keep PAK/content delivery separate; download data after install and verify it before launch.
6. Have the native UWP host load the packaged client and invoke `StartFortnite`.
7. Implement missing Win32 behavior in Project Zero shims incrementally from hardware/runtime failures.

`tools/convert-season7-client.py` implements step 1-3 structurally without embedding or downloading any game binary.

## Important technical boundary

Downloaded files in `PublisherCacheFolders` are suitable for data, not arbitrary new executable code. The converted client and compatibility DLLs should be part of the signed MSIX. PAKs, movies, manifests and other content can remain downloadable.

## Next implementation work

- Build `ProjectZeroRuntime.exe` as a native x64 UWP host.
- Add a packaged `Runtime/Win64` loader search path.
- Build clean-room shim DLLs matching only the imports required by 7.00.
- Add a packaging step that takes a locally converted Season 7 client and places it in the MSIX without committing the client binary to Git.
- Replace the current diagnostic Client Bridge handoff with the native runtime host once the first loader smoke test succeeds.
- Add content manifest v2 for individual files rather than a RAR archive.

No NeoXS binaries or source code should be committed to Project Zero.
