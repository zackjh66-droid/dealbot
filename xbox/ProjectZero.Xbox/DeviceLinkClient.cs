using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace ProjectZero.Xbox {
  public sealed class DeviceStart { public string code {get;set;} public string deviceToken {get;set;} public string verificationUrl {get;set;} public string expiresAt {get;set;} public int pollAfterSeconds {get;set;} }
  public sealed class DeviceStatus { public string status {get;set;} public string sessionToken {get;set;} public string expiresAt {get;set;} }

  public sealed class DeviceLinkClient {
    private readonly HttpClient http = new HttpClient();
    private readonly string apiBase;
    public DeviceLinkClient(string apiBase) { this.apiBase = apiBase.TrimEnd('/'); }

    public async Task<DeviceStart> StartAsync() {
      using var r = await http.PostAsync(apiBase + "/api/device/start", new StringContent("{}", Encoding.UTF8, "application/json"));
      r.EnsureSuccessStatusCode();
      return JsonSerializer.Deserialize<DeviceStart>(await r.Content.ReadAsStringAsync());
    }

    public async Task<DeviceStatus> PollUntilLinkedAsync(DeviceStart start, CancellationToken ct) {
      while (!ct.IsCancellationRequested) {
        var json = JsonSerializer.Serialize(new { deviceToken = start.deviceToken });
        using var r = await http.PostAsync(apiBase + "/api/device/status", new StringContent(json, Encoding.UTF8, "application/json"));
        var status = JsonSerializer.Deserialize<DeviceStatus>(await r.Content.ReadAsStringAsync());
        if (status?.status == "linked" || status?.status == "expired") return status;
        await Task.Delay(TimeSpan.FromSeconds(Math.Max(3,start.pollAfterSeconds)), ct);
      }
      throw new OperationCanceledException(ct);
    }
  }
}
