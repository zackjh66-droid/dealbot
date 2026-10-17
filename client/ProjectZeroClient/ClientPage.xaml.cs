using System;
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

            var contentState = await ReadContentStateAsync();
            PayloadText.Text = protocolState + "\n" + contentState;
        }

        private static async System.Threading.Tasks.Task<string> ReadContentStateAsync()
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

                if (string.IsNullOrWhiteSpace(fileName))
                {
                    return "content=NOT_VERIFIED\ncontent_marker=INVALID";
                }

                var file = await folder.GetFileAsync(fileName);
                var props = await file.GetBasicPropertiesAsync();

                return "content=VERIFIED" +
                       "\ncontent_file=" + file.Name +
                       "\ncontent_build=" + (build ?? "") +
                       "\ncontent_cl=" + (cl ?? "") +
                       "\ncontent_bytes=" + props.Size;
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
    }
}
