using System;
using System.Runtime.InteropServices;
using System.Threading.Tasks;

namespace ProjectZeroClient
{
    internal static class RuntimeLoader
    {
        private const string ClientDll = "FortniteClient-Win64-Shipping.dll";

        [DllImport("api-ms-win-core-libraryloader-l1-2-0.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        private static extern IntPtr LoadPackagedLibrary(string libraryName, uint reserved);

        [DllImport("api-ms-win-core-libraryloader-l1-1-0.dll", CharSet = CharSet.Ansi, SetLastError = true)]
        private static extern IntPtr GetProcAddress(IntPtr module, string procName);

        [UnmanagedFunctionPointer(CallingConvention.Cdecl)]
        private delegate int StartFortniteDelegate();

        public static async Task<string> TryStartAsync()
        {
            IntPtr module;
            try
            {
                // The package manifest adds Runtime\\Win64 to the package loader search path. The converted
                // client and Project Zero compatibility shims are staged there at package-build time.
                module = LoadPackagedLibrary(ClientDll, 0);
            }
            catch (Exception ex)
            {
                return "runtime=LOAD_EXCEPTION\nruntime_error=" + ex.GetType().Name;
            }

            if (module == IntPtr.Zero)
            {
                return "runtime=CLIENT_NOT_LOADABLE\nruntime_win32=" + Marshal.GetLastWin32Error();
            }

            var startPtr = GetProcAddress(module, "StartFortnite");
            if (startPtr == IntPtr.Zero)
            {
                return "runtime=NO_START_EXPORT\nruntime_win32=" + Marshal.GetLastWin32Error();
            }

            try
            {
                var start = (StartFortniteDelegate)Marshal.GetDelegateForFunctionPointer(
                    startPtr,
                    typeof(StartFortniteDelegate));

                // Fortnite owns its game loop after the exported bootstrap starts, so never block the XAML UI
                // thread while entering the native client.
                await Task.Run(() => start());
                return "runtime=CLIENT_RETURNED";
            }
            catch (Exception ex)
            {
                return "runtime=START_EXCEPTION\nruntime_error=" + ex.GetType().Name;
            }
        }
    }
}
