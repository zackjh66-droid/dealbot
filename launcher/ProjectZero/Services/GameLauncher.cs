using System;
using System.Text;
using System.Threading.Tasks;
using Windows.Data.Json;
using Windows.Storage;
using Windows.System;
using ProjectZero.Models;

namespace ProjectZero.Services
{
    public static class GameLauncher
    {
        public const string DefaultProtocol = "projectzero-game://launch";

        public static Uri BuildUri(TicketResult ticket, BuildInfo build)
        {
            var baseUri = build != null && !string.IsNullOrEmpty(build.LaunchUri)
                ? build.LaunchUri
                : DefaultProtocol;

            var sb = new StringBuilder(baseUri);
            sb.Append(baseUri.Contains("?") ? "&" : "?");
            sb.Append("ticket=").Append(Uri.EscapeDataString(ticket.Ticket ?? string.Empty));
            sb.Append("&account=").Append(Uri.EscapeDataString(ticket.Account != null ? ticket.Account.Username : string.Empty));
            sb.Append("&season=").Append(build != null ? build.Season : 0);
            sb.Append("&version=").Append(Uri.EscapeDataString(build != null ? build.Version : string.Empty));
            sb.Append("&cl=").Append(Uri.EscapeDataString(build != null ? build.Cl : string.Empty));
            sb.Append("&endpoint=").Append(Uri.EscapeDataString(AppConfig.BaseUrl));
            return new Uri(sb.ToString());
        }

        public static async Task<bool> TryLaunchAsync(Uri uri, TicketResult ticket)
        {
            try
            {
                var handoff = new JsonObject
                {
                    ["ticket"] = JsonValue.CreateStringValue(ticket.Ticket ?? string.Empty),
                    ["account"] = JsonValue.CreateStringValue(ticket.Account != null ? ticket.Account.Username : string.Empty),
                    ["launchUri"] = JsonValue.CreateStringValue(uri.ToString()),
                    ["issuedAt"] = JsonValue.CreateStringValue(DateTimeOffset.UtcNow.ToString("o"))
                };

                if (ticket.Build != null)
                {
                    handoff["build"] = new JsonObject
                    {
                        ["season"] = JsonValue.CreateNumberValue(ticket.Build.Season),
                        ["version"] = JsonValue.CreateStringValue(ticket.Build.Version ?? string.Empty),
                        ["cl"] = JsonValue.CreateStringValue(ticket.Build.Cl ?? string.Empty),
                        ["label"] = JsonValue.CreateStringValue(ticket.Build.BuildLabel ?? string.Empty)
                    };
                }

                var file = await ApplicationData.Current.LocalFolder.CreateFileAsync(
                    "handoff.json",
                    CreationCollisionOption.ReplaceExisting);
                await FileIO.WriteTextAsync(file, handoff.Stringify());
            }
            catch
            {
                // Local handoff file is diagnostic only.
            }

            try
            {
                return await Launcher.LaunchUriAsync(uri);
            }
            catch
            {
                return false;
            }
        }
    }
}
