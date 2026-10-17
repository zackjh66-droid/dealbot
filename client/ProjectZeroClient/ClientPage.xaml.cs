using System;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Threading.Tasks;
using Windows.Data.Json;
using Windows.Storage;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Navigation;

namespace ProjectZeroClient
{
    public sealed partial class ClientPage : Page
    {
        private const string SharedFolderName = "ProjectZeroContent";
        private const string MarkerFileName = "projectzero-content.json";

        public ClientPage() { InitializeComponent(); }

        protected override async void OnNavigatedTo(NavigationEventArgs e)
        {
            base.OnNavigatedTo(e);
            var raw = e.Parameter as string ?? "";

            string protocolState;
            try
            {
                var uri = new Uri(raw);
                protocolState = "scheme=" + uri.Scheme +
                                "\nactivation=OK" +
                                "\nquery_received=" + (!string.IsNullOrEmpty(uri.Query));
            }
            catch
            {
                protocolState = "activation=DIRECT";
            }

            PayloadText.Text = protocolState + "\ncontent=CHECKING";
            var contentState = await ReadAndVerifyContentStateAsync();
            PayloadText.Text = protocolState + "\n" + contentState;
        }

        private static async Task<string> ReadAndVerifyContentStateAsync()
        {
            try
            {
                var folder = ApplicationData.Current.GetPublisherCacheFolder(SharedFolderName);
                StorageFile marker;
                try
                {
                    marker = await folder.GetFileAsync(MarkerFileName);
                }
                catch
                {
                    return "content=NOT_VERIFIED\ncontent_marker=MISSING";
                }

                var markerText = await FileIO.ReadTextAsync(marker);
                var jo = JsonObject.Parse(markerText);
                var fileName = GetString(jo, "fileName");
                var build = GetString(jo, "build");
                var cl = GetString(jo, "cl");
                var expectedSha = GetString(jo, "sha256");
                var expectedSize = GetUlong(jo, "size");

                if (string.IsNullOrWhiteSpace(fileName))
                {
                    return "content=NOT_VERIFIED\ncontent_marker=INVALID";
                }

                var file = await folder.GetFileAsync(fileName);
                var props = await file.GetBasicPropertiesAsync();
                if (expectedSize > 0 && props.Size != expectedSize)
                {
                    return "content=NOT_VERIFIED\ncontent_error=SIZE_MISMATCH";
                }

                if (!string.IsNullOrWhiteSpace(expectedSha))
                {
                    string actualSha;
                    using (var stream = await file.OpenStreamForReadAsync())
                    using (var sha = SHA256.Create())
                    {
                        var hash = await Task.Run(() => sha.ComputeHash(stream));
                        actualSha = string.Concat(hash.Select(b => b.ToString("x2")));
                    }

                    if (!string.Equals(actualSha, expectedSha.Trim(), StringComparison.OrdinalIgnoreCase))
                    {
                        return "content=NOT_VERIFIED\ncontent_error=SHA256_MISMATCH";
                    }
                }

                return "content=VERIFIED" +
                       "\ncontent_file=" + file.Name +
                       "\ncontent_build=" + (build ?? "") +
                       "\ncontent_cl=" + (cl ?? "") +
                       "\ncontent_bytes=" + props.Size +
                       "\ncontent_hash=OK";
            }
            catch (Exception ex)
            {
                return "content=UNAVAILABLE\ncontent_error=" + ex.GetType().Name;
            }
        }

        private static string GetString(JsonObject jo, string key)
        {
            IJsonValue value;
            if (jo.TryGetValue(key, out value) && value.ValueType == JsonValueType.String)
            {
                return value.GetString();
            }

            return null;
        }

        private static ulong GetUlong(JsonObject jo, string key)
        {
            IJsonValue value;
            if (jo.TryGetValue(key, out value) && value.ValueType == JsonValueType.Number)
            {
                var number = value.GetNumber();
                if (number > 0) return (ulong)number;
            }

            return 0;
        }
    }
}
