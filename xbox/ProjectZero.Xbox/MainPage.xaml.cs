using System;
using System.Threading;
using Windows.Storage;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;

namespace ProjectZero.Xbox {
  public sealed partial class MainPage : Page {
    private readonly CancellationTokenSource cts = new CancellationTokenSource();
    // Replace with the deployed Project Zero HTTPS origin before packaging.
    private const string ApiBase = "https://PROJECT-ZERO-HOST.invalid";
    public MainPage() { InitializeComponent(); Loaded += OnLoaded; Unloaded += (_,__) => cts.Cancel(); }

    private async void OnLoaded(object sender, RoutedEventArgs e) {
      try {
        var client = new DeviceLinkClient(ApiBase);
        var start = await client.StartAsync();
        CodeText.Text = start.code;
        UrlText.Text = start.verificationUrl;
        StatusText.Text = "Open this address on your phone and enter the code";
        var status = await client.PollUntilLinkedAsync(start, cts.Token);
        if (status?.status != "linked") { StatusText.Text = "Code expired. Restart Project Zero to try again."; Busy.IsActive=false; return; }
        var vault = new PasswordVault();
        vault.Add(new Windows.Security.Credentials.PasswordCredential("ProjectZero", "launcher", status.sessionToken));
        StatusText.Text = "Account linked. Preparing client compatibility checks…";
        Busy.IsActive = true;
        // Next milestone: call ProjectZero.ClientBridge after local authorized client validation.
      } catch (Exception ex) {
        Busy.IsActive = false;
        StatusText.Text = "Connection failed: " + ex.Message;
      }
    }
  }
}
