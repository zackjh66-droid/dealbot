using System;
using System.Text;
using System.Threading.Tasks;
using Windows.Storage;
using Windows.System;
using Newtonsoft.Json;
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
                var handoff = JsonConvert.SerializeObject(new
                {
                    ticket = ticket.Ticket,
                    account = ticket.Account != null ? ticket.Account.Username : null,
                    build = ticket.Build,
                    launchUri = uri.ToString(),
                    issuedAt = DateTimeOffset.UtcNow
                }, Formatting.Indented);

                var file = await ApplicationData.Current.LocalFolder.CreateFileAsync(
                    "handoff.json",
                    CreationCollisionOption.ReplaceExisting);
                await FileIO.WriteTextAsync(file, handoff);
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
