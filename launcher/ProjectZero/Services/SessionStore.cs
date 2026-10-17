using Windows.Storage;

namespace ProjectZero.Services
{
    public static class SessionStore
    {
        private static ApplicationDataContainer Settings
        {
            get { return ApplicationData.Current.LocalSettings; }
        }

        public static string ConsoleToken
        {
            get { return Settings.Values["consoleToken"] as string; }
            set { Settings.Values["consoleToken"] = value; }
        }

        public static string Username
        {
            get { return Settings.Values["username"] as string; }
            set { Settings.Values["username"] = value; }
        }

        public static string BuildLabel
        {
            get { return Settings.Values["buildLabel"] as string; }
            set { Settings.Values["buildLabel"] = value; }
        }

        public static void Clear()
        {
            Settings.Values.Remove("consoleToken");
            Settings.Values.Remove("username");
            Settings.Values.Remove("buildLabel");
        }
    }
}
