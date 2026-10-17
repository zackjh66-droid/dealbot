#include <windows.h>
#include <winnt.h>
#include <algorithm>
#include <cctype>
#include <cstdint>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <string>
#include <vector>

// Project Zero static compatibility probe.
// Reads PE metadata/imports only. It does not execute, patch, decrypt, or modify the client.

struct Section { DWORD va, virtualSize, raw, rawSize; };

static std::string MachineName(WORD m) {
  switch (m) {
    case IMAGE_FILE_MACHINE_AMD64: return "x64";
    case IMAGE_FILE_MACHINE_I386: return "x86";
    case IMAGE_FILE_MACHINE_ARM64: return "arm64";
    default: return "unknown";
  }
}

static std::string Upper(std::string s) {
  std::transform(s.begin(), s.end(), s.begin(), [](unsigned char c){ return (char)std::toupper(c); });
  return s;
}

static bool ReadAt(std::ifstream& f, std::uint64_t off, void* dst, std::size_t n) {
  f.clear(); f.seekg((std::streamoff)off, std::ios::beg);
  return !!f.read(reinterpret_cast<char*>(dst), (std::streamsize)n);
}

static std::uint64_t RvaToOffset(DWORD rva, const std::vector<Section>& sections) {
  for (const auto& s : sections) {
    DWORD span = (std::max)(s.virtualSize, s.rawSize);
    if (rva >= s.va && rva < s.va + span) return (std::uint64_t)s.raw + (rva - s.va);
  }
  return rva; // header RVA
}

static std::string ReadCString(std::ifstream& f, std::uint64_t off, std::size_t maxLen = 4096) {
  std::string out; out.reserve(64);
  f.clear(); f.seekg((std::streamoff)off, std::ios::beg);
  for (std::size_t i=0; i<maxLen; ++i) {
    char c=0; if (!f.get(c) || c==0) break; out.push_back(c);
  }
  return out;
}

static const char* DllClass(const std::string& name) {
  const auto n = Upper(name);
  if (n.rfind("API-MS-WIN-",0)==0 || n.rfind("EXT-MS-WIN-",0)==0) return "api-set";
  if (n=="KERNEL32.DLL" || n=="KERNELBASE.DLL" || n=="NTDLL.DLL") return "core-review";
  if (n=="USER32.DLL" || n=="GDI32.DLL" || n=="SHELL32.DLL" || n=="ADVAPI32.DLL" ||
      n=="WINMM.DLL" || n=="WS2_32.DLL" || n=="OLE32.DLL" || n=="OLEAUT32.DLL" ||
      n=="VERSION.DLL" || n=="IPHLPAPI.DLL" || n=="WINHTTP.DLL") return "desktop-review";
  if (n.rfind("D3D",0)==0 || n=="DXGI.DLL" || n=="XINPUT1_4.DLL") return "graphics-input-review";
  return "dependency-review";
}

int wmain(int argc, wchar_t** argv) {
  if (argc != 2) {
    std::wcerr << L"usage: ProjectZero.ClientProbe <FortniteClient-Win64-Shipping.exe>\n";
    return 2;
  }
  std::filesystem::path p(argv[1]);
  std::ifstream f(p, std::ios::binary);
  if (!f) { std::wcerr << L"client not found\n"; return 3; }

  IMAGE_DOS_HEADER dos{};
  if (!ReadAt(f,0,&dos,sizeof dos) || dos.e_magic != IMAGE_DOS_SIGNATURE) {
    std::wcerr << L"not a PE executable\n"; return 4;
  }
  DWORD sig{};
  if (!ReadAt(f,(std::uint64_t)dos.e_lfanew,&sig,sizeof sig) || sig != IMAGE_NT_SIGNATURE) {
    std::wcerr << L"invalid PE signature\n"; return 5;
  }

  const std::uint64_t fileHeaderOff=(std::uint64_t)dos.e_lfanew+sizeof(DWORD);
  IMAGE_FILE_HEADER fh{};
  if (!ReadAt(f,fileHeaderOff,&fh,sizeof fh)) return 5;

  std::cout << "Project Zero Season 7 static client probe\n";
  std::cout << "architecture=" << MachineName(fh.Machine) << "\nsections=" << fh.NumberOfSections << "\n";
  if (fh.Machine != IMAGE_FILE_MACHINE_AMD64) {
    std::cerr << "BLOCKER: Xbox UWP target is x64; supplied client is not x64.\n"; return 6;
  }

  const std::uint64_t optOff=fileHeaderOff+sizeof(IMAGE_FILE_HEADER);
  WORD magic{}; if (!ReadAt(f,optOff,&magic,sizeof magic)) return 7;
  if (magic != IMAGE_NT_OPTIONAL_HDR64_MAGIC) {
    std::cerr << "BLOCKER: expected PE32+ optional header.\n"; return 7;
  }
  IMAGE_OPTIONAL_HEADER64 opt{};
  if (!ReadAt(f,optOff,&opt,(std::min<std::size_t>)(sizeof opt,fh.SizeOfOptionalHeader))) return 7;

  std::vector<Section> sections;
  std::uint64_t sectionOff=optOff+fh.SizeOfOptionalHeader;
  for (WORD i=0;i<fh.NumberOfSections;++i) {
    IMAGE_SECTION_HEADER sh{};
    if (!ReadAt(f,sectionOff+(std::uint64_t)i*sizeof sh,&sh,sizeof sh)) return 8;
    sections.push_back({sh.VirtualAddress,sh.Misc.VirtualSize,sh.PointerToRawData,sh.SizeOfRawData});
  }

  std::cout << "subsystem=" << opt.Subsystem << "\n";
  std::cout << "entry_rva=0x" << std::hex << opt.AddressOfEntryPoint << std::dec << "\n";
  if (opt.NumberOfRvaAndSizes <= IMAGE_DIRECTORY_ENTRY_IMPORT ||
      opt.DataDirectory[IMAGE_DIRECTORY_ENTRY_IMPORT].VirtualAddress == 0) {
    std::cout << "imports=0\n"; return 0;
  }

  const auto& dir=opt.DataDirectory[IMAGE_DIRECTORY_ENTRY_IMPORT];
  std::uint64_t descOff=RvaToOffset(dir.VirtualAddress,sections);
  unsigned dllCount=0, symbolCount=0;
  for (unsigned i=0;i<4096;++i) {
    IMAGE_IMPORT_DESCRIPTOR d{};
    if (!ReadAt(f,descOff+(std::uint64_t)i*sizeof d,&d,sizeof d)) break;
    if (d.Name==0 && d.FirstThunk==0 && d.OriginalFirstThunk==0) break;
    std::string dll=ReadCString(f,RvaToOffset(d.Name,sections));
    if (dll.empty()) dll="<invalid-name>";
    ++dllCount;
    std::cout << "DLL " << dll << " class=" << DllClass(dll) << "\n";

    DWORD thunkRva=d.OriginalFirstThunk ? d.OriginalFirstThunk : d.FirstThunk;
    std::uint64_t thunkOff=RvaToOffset(thunkRva,sections);
    for (unsigned t=0;t<200000;++t) {
      ULONGLONG thunk{};
      if (!ReadAt(f,thunkOff+(std::uint64_t)t*sizeof thunk,&thunk,sizeof thunk) || thunk==0) break;
      ++symbolCount;
      if (IMAGE_SNAP_BY_ORDINAL64(thunk)) {
        std::cout << "  ordinal=" << IMAGE_ORDINAL64(thunk) << "\n";
      } else {
        DWORD nameRva=(DWORD)thunk;
        WORD hint{}; auto nameOff=RvaToOffset(nameRva,sections);
        ReadAt(f,nameOff,&hint,sizeof hint);
        std::string fn=ReadCString(f,nameOff+sizeof(WORD));
        std::cout << "  " << fn << "\n";
      }
    }
  }
  std::cout << "import_dlls=" << dllCount << "\nimport_symbols=" << symbolCount << "\n";
  std::cout << "NOTE: classifications identify review areas; they are not claims that every imported function is unsupported on UWP/Xbox.\n";
  return 0;
}
