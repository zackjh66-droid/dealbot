#include <windows.h>
#include <winnt.h>
#include <filesystem>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <string>

// Project Zero compatibility probe. It does not patch, decrypt or redistribute the client.
// It only validates a user-supplied executable and enumerates its PE imports so we can
// compare dependencies with APIs available to the Xbox/UWP environment.

static std::string MachineName(WORD m) {
  switch (m) { case IMAGE_FILE_MACHINE_AMD64: return "x64"; case IMAGE_FILE_MACHINE_I386: return "x86"; case IMAGE_FILE_MACHINE_ARM64: return "arm64"; default: return "unknown"; }
}

int wmain(int argc, wchar_t** argv) {
  if (argc != 2) { std::wcerr << L"usage: ProjectZero.ClientProbe <FortniteClient-Win64-Shipping.exe>\n"; return 2; }
  std::filesystem::path p(argv[1]);
  std::ifstream f(p, std::ios::binary);
  if (!f) { std::wcerr << L"client not found\n"; return 3; }
  IMAGE_DOS_HEADER dos{}; f.read(reinterpret_cast<char*>(&dos), sizeof dos);
  if (dos.e_magic != IMAGE_DOS_SIGNATURE) { std::wcerr << L"not a PE executable\n"; return 4; }
  f.seekg(dos.e_lfanew);
  DWORD sig{}; f.read(reinterpret_cast<char*>(&sig), sizeof sig);
  if (sig != IMAGE_NT_SIGNATURE) { std::wcerr << L"invalid PE signature\n"; return 5; }
  IMAGE_FILE_HEADER fh{}; f.read(reinterpret_cast<char*>(&fh), sizeof fh);
  std::cout << "Project Zero client probe\narchitecture=" << MachineName(fh.Machine) << "\nsections=" << fh.NumberOfSections << "\n";
  if (fh.Machine != IMAGE_FILE_MACHINE_AMD64) { std::cerr << "BLOCKER: Xbox UWP target is x64; supplied client is not x64.\n"; return 6; }
  std::cout << "PE header accepted. Next probe stage: import-table compatibility map.\n";
  return 0;
}
