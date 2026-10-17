using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;
using Windows.Data.Json;
using ProjectZero.Models;

namespace ProjectZero.Services
{
    public class ApiException : Exception
    {
        public ApiException(string message) : base(message) { }
    }

    public static class ApiClient
    {
        private static readonly HttpClient Http = new HttpClient
        {
            Timeout = TimeSpan.FromSeconds(20)
        };

        public static string QrUrl(string data)
        {
            return AppConfig.BaseUrl + "/api/qr?data=" + Uri.EscapeDataString(data);
        }

        public static async Task<LinkStartResult> StartLinkAsync()
        {
            var body = new JsonObject
            {
                ["deviceName"] = JsonValue.CreateStringValue(AppConfig.DeviceName),
                ["platform"] = JsonValue.CreateStringValue("xbox"),
                ["appVersion"] = JsonValue.CreateStringValue(AppConfig.AppVersion)
            };

            var jo = await PostJsonAsync("/api/link/start", body, null);
            return new LinkStartResult
            {
                Code = GetString(jo, "code"),
                PollToken = GetString(jo, "pollToken"),
                LinkUrl = GetString(jo, "linkUrl"),
                ExpiresAt = GetString(jo, "expiresAt")
            };
        }

        public static async Task<LinkPollResult> PollAsync(string code, string pollToken)
        {
            var body = new JsonObject
            {
                ["code"] = JsonValue.CreateStringValue(code),
                ["pollToken"] = JsonValue.CreateStringValue(pollToken)
            };

            var jo = await PostJsonAsync("/api/link/poll", body, null);
            var result = new LinkPollResult
            {
                Status = GetString(jo, "status"),
                SessionToken = GetString(jo, "sessionToken"),
                Builds = new List<BuildInfo>()
            };

            var account = GetObject(jo, "account");
            if (account != null)
            {
                result.Account = new AccountInfo
                {
                    Id = GetString(account, "id"),
                    Username = GetString(account, "username"),
                    AccountNo = GetLong(account, "accountNo")
                };
            }

            var builds = GetArray(jo, "builds");
            if (builds != null)
            {
                foreach (var item in builds)
                {
                    result.Builds.Add(ReadBuild(item.GetObject()));
                }
            }

            return result;
        }

        public static async Task<TicketResult> GetTicketAsync(string consoleToken)
        {
            var jo = await PostJsonAsync("/api/game/ticket", new JsonObject(), consoleToken);
            var result = new TicketResult
            {
                Ticket = GetString(jo, "ticket"),
                ExpiresAt = GetString(jo, "expiresAt")
            };

            var account = GetObject(jo, "account");
            if (account != null)
            {
                result.Account = new AccountInfo
                {
                    Id = GetString(account, "id"),
                    Username = GetString(account, "username"),
                    AccountNo = GetLong(account, "accountNo")
                };
            }

            var build = GetObject(jo, "build");
            if (build != null)
            {
                result.Build = ReadBuild(build);
            }

            return result;
        }

        public static async Task<ContentManifest> GetContentManifestAsync(string consoleToken)
        {
            var jo = await GetJsonAsync("/api/content/manifest", consoleToken);
            var result = new ContentManifest
            {
                Available = GetBool(jo, "available"),
                Mode = GetString(jo, "mode"),
                Build = GetString(jo, "build"),
                Cl = GetString(jo, "cl"),
                FileName = GetString(jo, "fileName"),
                Url = GetString(jo, "url"),
                Sha256 = GetString(jo, "sha256"),
                Size = (ulong)Math.Max(0, GetLong(jo, "size")),
                FileCount = (int)Math.Max(0, GetLong(jo, "fileCount")),
                TotalSize = (ulong)Math.Max(0, GetLong(jo, "totalSize")),
                Files = new List<ContentFileManifest>(),
                Reason = GetString(jo, "reason")
            };

            var files = GetArray(jo, "files");
            if (files != null)
            {
                foreach (var item in files)
                {
                    if (item.ValueType != JsonValueType.Object) continue;
                    var file = item.GetObject();
                    result.Files.Add(new ContentFileManifest
                    {
                        Path = GetString(file, "path"),
                        Url = GetString(file, "url"),
                        Sha256 = GetString(file, "sha256"),
                        Etag = GetString(file, "etag"),
                        Size = (ulong)Math.Max(0, GetLong(file, "size"))
                    });
                }
            }

            if (result.FileCount == 0 && result.Files.Count > 0)
            {
                result.FileCount = result.Files.Count;
            }

            return result;
        }

        private static BuildInfo ReadBuild(JsonObject item)
        {
            return new BuildInfo
            {
                Season = (int)GetLong(item, "season"),
                Channel = GetString(item, "channel"),
                Version = GetString(item, "version"),
                Cl = GetString(item, "cl"),
                BuildLabel = GetString(item, "buildLabel"),
                LaunchUri = GetString(item, "launchUri"),
                PackageFamilyName = GetString(item, "packageFamilyName")
            };
        }

        private static string GetString(JsonObject jo, string key)
        {
            IJsonValue value;
            return jo.TryGetValue(key, out value) && value.ValueType == JsonValueType.String
                ? value.GetString()
                : null;
        }

        private static long GetLong(JsonObject jo, string key)
        {
            IJsonValue value;
            return jo.TryGetValue(key, out value) && value.ValueType == JsonValueType.Number
                ? (long)value.GetNumber()
                : 0;
        }

        private static bool GetBool(JsonObject jo, string key)
        {
            IJsonValue value;
            return jo.TryGetValue(key, out value) && value.ValueType == JsonValueType.Boolean && value.GetBoolean();
        }

        private static JsonObject GetObject(JsonObject jo, string key)
        {
            IJsonValue value;
            return jo.TryGetValue(key, out value) && value.ValueType == JsonValueType.Object
                ? value.GetObject()
                : null;
        }

        private static JsonArray GetArray(JsonObject jo, string key)
        {
            IJsonValue value;
            return jo.TryGetValue(key, out value) && value.ValueType == JsonValueType.Array
                ? value.GetArray()
                : null;
        }

        private static async Task<JsonObject> GetJsonAsync(string path, string bearer)
        {
            using (var request = new HttpRequestMessage(HttpMethod.Get, AppConfig.BaseUrl + path))
            {
                request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                if (!string.IsNullOrEmpty(bearer))
                {
                    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearer);
                }
                using (var response = await Http.SendAsync(request))
                {
                    var text = await response.Content.ReadAsStringAsync();
                    if (!response.IsSuccessStatusCode)
                    {
                        throw new ApiException("HTTP " + (int)response.StatusCode + " " + text);
                    }
                    return JsonObject.Parse(text);
                }
            }
        }

        private static async Task<JsonObject> PostJsonAsync(string path, JsonObject payload, string bearer)
        {
            using (var request = new HttpRequestMessage(HttpMethod.Post, AppConfig.BaseUrl + path))
            {
                request.Content = new StringContent(payload.Stringify(), Encoding.UTF8, "application/json");
                request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                if (!string.IsNullOrEmpty(bearer))
                {
                    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearer);
                }

                using (var response = await Http.SendAsync(request))
                {
                    var text = await response.Content.ReadAsStringAsync();
                    if (!response.IsSuccessStatusCode)
                    {
                        throw new ApiException("HTTP " + (int)response.StatusCode + " " + text);
                    }
                    return JsonObject.Parse(text);
                }
            }
        }
    }
}
