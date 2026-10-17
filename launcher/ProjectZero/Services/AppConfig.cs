using Windows.Storage;

namespace ProjectZero.Services
{
    public static class AppConfig
    {
        // Production control plane. Override at runtime by writing a string value
        // named "apiBase" into ApplicationData.Current.LocalSettings.
        public const string DefaultBaseUrl = "https://project-zero-delta.vercel.app";
        public const string AppVersion = "1.0.0";

        public static string BaseUrl
        {
            get
            {
                var custom = ApplicationData.Current.LocalSettings.Values["apiBase"] as string;
                if (!string.IsNullOrWhiteSpace(custom))
                {
                    return custom.TrimEnd('/');
                }

                return DefaultBaseUrl;
            }
        }

        public static string DeviceName
        {
            get
            {
                var family = Windows.System.Profile.AnalyticsInfo.VersionInfo.DeviceFamily;
                return family == "Windows.Xbox" ? "Xbox console" : "Windows device";
            }
        }
    }
}
