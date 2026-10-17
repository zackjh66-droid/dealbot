using System;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Windows.Data.Json;
using Windows.Security.Credentials;
using Windows.Storage;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Navigation;

namespace ProjectZeroClient
{
    public sealed partial class ClientPage : Page
    {
        private const string SharedFolderName = "ProjectZeroContent";
        private const string MarkerFileName = "projectzero-content.json";
        private static readonly HttpClient Http = new HttpClient { Timeout = TimeSpan.FromSeconds(20) };

        public ClientPage() { InitializeComponent(); }

        protected override async void OnNavigatedTo(NavigationEventArgs e)
        {
            base.OnNavigatedTo(e);
            var raw = e.Parameter as string ?? "";

            string protocolState;
            string sessionState = "session=NOT_REQUESTED";
            try
            {
                var uri = new Uri(raw);
                protocolState = "scheme=" + uri.Scheme +
                                "\nactivation=OK" +
                                "\nquery_received=" + (!string.IsNullOrEmpty(uri.Query));

                var ticket = QueryValue(uri, "ticket");
                var endpoint = QueryValue(uri, "endpoint");
                if (!string.IsNullOrWhiteSpace(ticket) && !string.IsNullOrWhiteSpace(endpoint))
                {
                    PayloadText.Text = protocolState + "\nsession=CONNECTING\ncontent=WAITING";
                    sessionState = await RedeemGameSessionAsync(endpoint, ticket);
                }
            }
            catch
            {
                protocolState = "activation=DIRECT";
            }

            PayloadText.Text = protocolState + "\n" + sessionState + "\ncontent=CHECKING";
            var contentState = await ReadAndVerifyContentStateAsync();
            PayloadText.Text = protocolState + "\n" + sessionState + "\n" + contentState;
        }

        private static async Task<string> RedeemGameSessionAsync(string endpoint, string ticket)
        {
            Uri baseUri;
            if (!Uri.TryCreate(endpoint, UriKind.Absolute, out baseUri) ||
                !string.Equals(baseUri.Scheme, "https", StringComparison.OrdinalIgnoreCase))
            {
                return "session=FAILED\nsession_error=INVALID_ENDPOINT";
            }

            try
            {
                var payload = new JsonObject
                {
                    ["ticket"] = JsonValue.CreateStringValue(ticket)
                };

                using (var content = new StringContent(payload.Stringify(), Encoding.UTF8, "application/json"))
                using (var response = await Http.PostAsync(endpoint.TrimEnd('/') + "/api/game/session", content))
                {
                    var text = await response.Content.ReadAsStringAsync();
                    if (!response.IsSuccessStatusCode)
                    {
                        return "session=FAILED\nsession_http=" + (int)response.StatusCode;
                    }

                    var jo = JsonObject.Parse(text);
                    var token = GetString(jo, "sessionToken");
                    if (string.IsNullOrWhiteSpace(token))
                    {
                        return "session=FAILED\nsession_error=NO_TOKEN";
                    }

                    SaveGameSessionToken(token);

                    var accountName = "";
                    IJsonValue accountValue;
                    if (jo.TryGetValue("account", out accountValue) && accountValue.ValueType == JsonValueType.Object)
                    {
                        accountName = GetString(accountValue.GetObject(), "username") ?? "";
                    }

                    var buildVersion = "";
                    var buildCl = "";
                    IJsonValue buildValue;
                    if (jo.TryGetValue("build", out buildValue) && buildValue.ValueType == JsonValueType.Object)
                    {
                        var build = buildValue.GetObject();
                        buildVersion = GetString(build, "version") ?? "";
                        buildCl = GetString(build, "cl") ?? "";
                    }

                    return "session=OK" +
                           "\naccount=" + accountName +
                           "\nsession_build=" + buildVersion +
                           "\nsession_cl=" + buildCl;
                }
            }
            catch (Exception ex)
            {
                return "session=FAILED\nsession_error=" + ex.GetType().Name;
            }
        }

        private static void SaveGameSessionToken(string token)
        {
            try
            {
                var vault = new PasswordVault();
                foreach (var credential in vault.FindAllByResource("ProjectZero.GameSession"))
                {
                    try { vault.Remove(credential); } catch { }
                }
                vault.Add(new PasswordCredential("ProjectZero.GameSession", "current", token));
            }
            catch
            {
                // Session is still valid for this activation even if credential persistence is unavailable.
            }
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

        private static string QueryValue(Uri uri, string key)
        {
            var query = uri.Query;
            if (string.IsNullOrWhiteSpace(query)) return null;
            if (query.StartsWith("?")) query = query.Substring(1);

            foreach (var part in query.Split('&'))
            {
                var bits = part.Split(new[] { '=' }, 2);
                if (bits.Length == 0) continue;
                var name = Uri.UnescapeDataString(bits[0] ?? "");
                if (!string.Equals(name, key, StringComparison.OrdinalIgnoreCase)) continue;
                return bits.Length > 1 ? Uri.UnescapeDataString(bits[1] ?? "") : "";
            }

            return null;
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
