using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using ProjectZero.Models;

namespace ProjectZero.Services
{
    public class ApiException : Exception
    {
        public ApiException(string message) : base(message)
        {
        }
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
            var body = new
            {
                deviceName = AppConfig.DeviceName,
                platform = "xbox",
                appVersion = AppConfig.AppVersion,
                consoleId = Windows.System.Profile.AnalyticsInfo.VersionInfo.DeviceFamily
            };

            var jo = await PostJsonAsync("/api/link/start", body, null);
            return new LinkStartResult
            {
                Code = (string)jo["code"],
                PollToken = (string)jo["pollToken"],
                LinkUrl = (string)jo["linkUrl"],
                ExpiresAt = (string)jo["expiresAt"]
            };
        }

        public static async Task<LinkPollResult> PollAsync(string code, string pollToken)
        {
            var jo = await PostJsonAsync("/api/link/poll", new { code, pollToken }, null);
            var result = new LinkPollResult
            {
                Status = (string)jo["status"],
                SessionToken = (string)jo["sessionToken"],
                Builds = new List<BuildInfo>()
            };

            var account = jo["account"] as JObject;
            if (account != null)
            {
                result.Account = new AccountInfo
                {
                    Id = (string)account["id"],
                    Username = (string)account["username"],
                    AccountNo = account["accountNo"] != null ? (long)account["accountNo"] : 0
                };
            }

            var builds = jo["builds"] as JArray;
            if (builds != null)
            {
                foreach (var item in builds)
                {
                    result.Builds.Add(new BuildInfo
                    {
                        Season = item["season"] != null ? (int)item["season"] : 0,
                        Channel = (string)item["channel"],
                        Version = (string)item["version"],
                        Cl = (string)item["cl"],
                        BuildLabel = (string)item["buildLabel"],
                        LaunchUri = (string)item["launchUri"],
                        PackageFamilyName = (string)item["packageFamilyName"]
                    });
                }
            }

            return result;
        }

        public static async Task<TicketResult> GetTicketAsync(string consoleToken)
        {
            var jo = await PostJsonAsync("/api/game/ticket", new { }, consoleToken);
            var result = new TicketResult
            {
                Ticket = (string)jo["ticket"],
                ExpiresAt = (string)jo["expiresAt"]
            };

            var account = jo["account"] as JObject;
            if (account != null)
            {
                result.Account = new AccountInfo
                {
                    Id = (string)account["id"],
                    Username = (string)account["username"],
                    AccountNo = account["accountNo"] != null ? (long)account["accountNo"] : 0
                };
            }

            var build = jo["build"] as JObject;
            if (build != null)
            {
                result.Build = new BuildInfo
                {
                    Season = build["season"] != null ? (int)build["season"] : 0,
                    Channel = (string)build["channel"],
                    Version = (string)build["version"],
                    Cl = (string)build["cl"],
                    BuildLabel = (string)build["buildLabel"],
                    LaunchUri = (string)build["launchUri"],
                    PackageFamilyName = (string)build["packageFamilyName"]
                };
            }

            return result;
        }

        private static async Task<JObject> PostJsonAsync(string path, object payload, string bearer)
        {
            var url = AppConfig.BaseUrl + path;
            var json = JsonConvert.SerializeObject(payload);
            using (var request = new HttpRequestMessage(HttpMethod.Post, url))
            {
                request.Content = new StringContent(json, Encoding.UTF8, "application/json");
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

                    return JObject.Parse(text);
                }
            }
        }
    }
}
