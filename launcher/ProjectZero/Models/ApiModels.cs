using System.Collections.Generic;

namespace ProjectZero.Models
{
    public class LinkStartResult
    {
        public string Code { get; set; }
        public string PollToken { get; set; }
        public string LinkUrl { get; set; }
        public string ExpiresAt { get; set; }
    }

    public class AccountInfo
    {
        public string Id { get; set; }
        public string Username { get; set; }
        public long AccountNo { get; set; }
    }

    public class BuildInfo
    {
        public int Season { get; set; }
        public string Channel { get; set; }
        public string Version { get; set; }
        public string Cl { get; set; }
        public string BuildLabel { get; set; }
        public string LaunchUri { get; set; }
        public string PackageFamilyName { get; set; }
    }

    public class ContentManifest
    {
        public bool Available { get; set; }
        public string Build { get; set; }
        public string Cl { get; set; }
        public string FileName { get; set; }
        public string Url { get; set; }
        public string Sha256 { get; set; }
        public ulong Size { get; set; }
        public string Reason { get; set; }
    }

    public class LinkPollResult
    {
        public string Status { get; set; }
        public AccountInfo Account { get; set; }
        public string SessionToken { get; set; }
        public List<BuildInfo> Builds { get; set; }
    }

    public class TicketResult
    {
        public string Ticket { get; set; }
        public string ExpiresAt { get; set; }
        public AccountInfo Account { get; set; }
        public BuildInfo Build { get; set; }
    }
}
