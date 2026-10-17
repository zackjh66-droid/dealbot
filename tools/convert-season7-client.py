#!/usr/bin/env python3
"""Convert an authorized Season 7 Win64 client EXE into the DLL shape used by Project Zero's UWP host.

This tool does not contain or download Fortnite binaries. It operates only on a local file supplied by the
operator. The conversion is structural: retarget selected desktop DLL import names to Project Zero shim
names, set IMAGE_FILE_DLL, add a tiny UWP bootstrap section, and export StartFortnite which jumps to the
original entry point.

It does NOT make the client runnable by itself. Matching Project Zero compatibility shims and a UWP host are
still required, and every converted build must be tested on hardware.
"""

from __future__ import annotations

import argparse
import hashlib
import os
import struct
from pathlib import Path

IMPORT_REMAP = {
    "WINMM.dll": "UWPMM.dll",
    "KERNEL32.dll": "UWKRNL32.dll",
    "USER32.dll": "UWPU32.dll",
    "ADVAPI32.dll": "UWADVAPI.dll",
    "SHELL32.dll": "UWSHL32.dll",
    "ole32.dll": "uwole.dll",
    "SETUPAPI.dll": "UWSETUP.dll",
    "dwmapi.dll": "uwdwm.dll",
    "IMM32.dll": "UWIMM.dll",
    "XINPUT1_3.dll": "UWXIN13.dll",
    "d3d9.dll": "ud39.dll",
    "OPENGL32.dll": "UWPGL32.dll",
    "DSOUND.dll": "UWSND.dll",
    "VERSION.dll": "UWVER.dll",
}


def align_up(value: int, alignment: int) -> int:
    return (value + alignment - 1) // alignment * alignment


def u16(data: bytearray, offset: int) -> int:
    return struct.unpack_from("<H", data, offset)[0]


def u32(data: bytearray, offset: int) -> int:
    return struct.unpack_from("<I", data, offset)[0]


def put16(data: bytearray, offset: int, value: int) -> None:
    struct.pack_into("<H", data, offset, value)


def put32(data: bytearray, offset: int, value: int) -> None:
    struct.pack_into("<I", data, offset, value)


def parse_sections(data: bytearray, pe_offset: int, section_count: int, optional_size: int):
    table = pe_offset + 4 + 20 + optional_size
    sections = []
    for index in range(section_count):
        offset = table + index * 40
        name = bytes(data[offset : offset + 8]).split(b"\0", 1)[0].decode("ascii", "ignore")
        sections.append(
            {
                "header_offset": offset,
                "name": name,
                "virtual_size": u32(data, offset + 8),
                "virtual_address": u32(data, offset + 12),
                "raw_size": u32(data, offset + 16),
                "raw_offset": u32(data, offset + 20),
            }
        )
    return table, sections


def rva_to_offset(rva: int, sections) -> int:
    for section in sections:
        span = max(section["virtual_size"], section["raw_size"])
        start = section["virtual_address"]
        if start <= rva < start + span:
            return section["raw_offset"] + (rva - start)
    raise ValueError(f"RVA 0x{rva:x} is not mapped by any section")


def patch_import_names(data: bytearray, optional_header: int, sections):
    # PE32+ data directories begin 112 bytes into IMAGE_OPTIONAL_HEADER64.
    import_rva = u32(data, optional_header + 112 + 8)
    if not import_rva:
        return []

    descriptor = rva_to_offset(import_rva, sections)
    changed = []
    while True:
        original_first_thunk, timestamp, forwarder, name_rva, first_thunk = struct.unpack_from(
            "<IIIII", data, descriptor
        )
        if not any((original_first_thunk, timestamp, forwarder, name_rva, first_thunk)):
            break

        name_offset = rva_to_offset(name_rva, sections)
        end = data.find(0, name_offset)
        if end < 0:
            raise ValueError("unterminated import DLL name")

        old_name = bytes(data[name_offset:end]).decode("ascii", "ignore")
        new_name = IMPORT_REMAP.get(old_name)
        if new_name:
            if len(new_name) > len(old_name):
                raise ValueError(f"import remap is too long: {old_name} -> {new_name}")
            replacement = new_name.encode("ascii") + b"\0" * (len(old_name) + 1 - len(new_name))
            data[name_offset : name_offset + len(old_name) + 1] = replacement
            changed.append((old_name, new_name))

        descriptor += 20

    return changed


def convert(source: Path, destination: Path) -> None:
    data = bytearray(source.read_bytes())
    if data[:2] != b"MZ":
        raise ValueError("input is not a PE file")

    pe = u32(data, 0x3C)
    if data[pe : pe + 4] != b"PE\0\0":
        raise ValueError("invalid PE signature")

    file_header = pe + 4
    section_count = u16(data, file_header + 2)
    optional_size = u16(data, file_header + 16)
    characteristics = u16(data, file_header + 18)
    optional_header = file_header + 20

    if u16(data, optional_header) != 0x20B:
        raise ValueError("only x64 PE32+ clients are supported")

    original_entry_rva = u32(data, optional_header + 16)
    section_alignment = u32(data, optional_header + 32)
    file_alignment = u32(data, optional_header + 36)

    section_table, sections = parse_sections(data, pe, section_count, optional_size)
    first_raw = min(section["raw_offset"] for section in sections if section["raw_offset"])
    new_section_header = section_table + section_count * 40
    if new_section_header + 40 > first_raw:
        raise ValueError("PE headers have no room for an additional section header")

    remapped = patch_import_names(data, optional_header, sections)

    last = max(
        sections,
        key=lambda s: s["virtual_address"] + max(s["virtual_size"], s["raw_size"]),
    )
    new_rva = align_up(
        last["virtual_address"] + max(last["virtual_size"], last["raw_size"]),
        section_alignment,
    )

    raw_offset = align_up(len(data), file_alignment)
    if raw_offset > len(data):
        data.extend(b"\0" * (raw_offset - len(data)))

    # .uwpboot layout. The new PE entry point is a DLL entry stub that returns TRUE. StartFortnite is an
    # exported near jump to the original EXE entry point.
    dll_main_offset = 0x00
    start_offset = 0x10
    export_offset = 0x20
    functions_offset = 0x48
    names_offset = 0x4C
    ordinals_offset = 0x50
    dll_name_offset = 0x58

    dll_name = b"FortniteClient-Win64-Shipping.dll\0"
    export_name = b"StartFortnite\0"
    export_name_offset = dll_name_offset + len(dll_name)
    virtual_size = export_name_offset + len(export_name)
    raw_size = align_up(virtual_size, file_alignment)
    section = bytearray(raw_size)

    section[dll_main_offset : dll_main_offset + 6] = b"\xB8\x01\x00\x00\x00\xC3"
    relative = original_entry_rva - (new_rva + start_offset + 5)
    if not -(1 << 31) <= relative < (1 << 31):
        raise ValueError("original entry point is outside rel32 range")
    section[start_offset] = 0xE9
    struct.pack_into("<i", section, start_offset + 1, relative)

    struct.pack_into(
        "<IIHHIIIIIII",
        section,
        export_offset,
        0,
        0,
        0,
        0,
        new_rva + dll_name_offset,
        1,
        1,
        1,
        new_rva + functions_offset,
        new_rva + names_offset,
        new_rva + ordinals_offset,
    )
    struct.pack_into("<I", section, functions_offset, new_rva + start_offset)
    struct.pack_into("<I", section, names_offset, new_rva + export_name_offset)
    struct.pack_into("<H", section, ordinals_offset, 0)
    section[dll_name_offset : dll_name_offset + len(dll_name)] = dll_name
    section[export_name_offset : export_name_offset + len(export_name)] = export_name

    # Add IMAGE_SECTION_HEADER for .uwpboot.
    data[new_section_header : new_section_header + 8] = b".uwpboot"
    put32(data, new_section_header + 8, virtual_size)
    put32(data, new_section_header + 12, new_rva)
    put32(data, new_section_header + 16, raw_size)
    put32(data, new_section_header + 20, raw_offset)
    put32(data, new_section_header + 24, 0)
    put32(data, new_section_header + 28, 0)
    put16(data, new_section_header + 32, 0)
    put16(data, new_section_header + 34, 0)
    put32(data, new_section_header + 36, 0x60000020)  # code | execute | read

    put16(data, file_header + 2, section_count + 1)
    put16(data, file_header + 18, characteristics | 0x2000)  # IMAGE_FILE_DLL
    put32(data, optional_header + 16, new_rva + dll_main_offset)
    put32(data, optional_header + 4, u32(data, optional_header + 4) + raw_size)
    put32(data, optional_header + 56, align_up(new_rva + virtual_size, section_alignment))
    put32(data, optional_header + 112, new_rva + export_offset)
    put32(data, optional_header + 116, virtual_size - export_offset)
    put32(data, optional_header + 64, 0)  # checksum is regenerated when the package is produced/signed

    data.extend(section)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(data)

    print(f"source:      {source}")
    print(f"destination: {destination}")
    print(f"source sha256: {hashlib.sha256(source.read_bytes()).hexdigest()}")
    print(f"output sha256: {hashlib.sha256(destination.read_bytes()).hexdigest()}")
    print(f"original entry RVA: 0x{original_entry_rva:x}")
    print(f"new DLL entry RVA:  0x{new_rva:x}")
    print(f"StartFortnite RVA:  0x{new_rva + start_offset:x}")
    print("import remaps:")
    for old_name, new_name in remapped:
        print(f"  {old_name} -> {new_name}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path, help="authorized FortniteClient-Win64-Shipping.exe")
    parser.add_argument("destination", type=Path, help="output DLL path")
    args = parser.parse_args()

    if args.source.resolve() == args.destination.resolve():
        raise SystemExit("source and destination must be different files")
    if not args.source.is_file():
        raise SystemExit(f"source not found: {args.source}")

    convert(args.source, args.destination)


if __name__ == "__main__":
    main()
