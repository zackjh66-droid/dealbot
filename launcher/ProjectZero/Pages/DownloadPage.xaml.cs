using System;
using System.Threading;
using System.Threading.Tasks;
using Windows.Storage;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Navigation;
using ProjectZero.Models;
using ProjectZero.Services;

namespace ProjectZero.Pages
{
    public sealed partial class DownloadPage : Page
    {
        private ContentManifest _manifest;
        private CancellationTokenSource _downloadCts;
        private bool _busy;

        public DownloadPage()
        {
            InitializeComponent();
        }

        protected override async void OnNavigatedTo(NavigationEventArgs e)
        {
            base.OnNavigatedTo(e);
            await PrepareAsync();
        }

        protected override void OnNavigatedFrom(NavigationEventArgs e)
        {
            _downloadCts?.Cancel();
            base.OnNavigatedFrom(e);
        }

        private async Task PrepareAsync()
        {
            if (_busy) return;
            _busy = true;
            RetryButton.Visibility = Visibility.Collapsed;
            ContinueButton.Visibility = Visibility.Collapsed;
            CancelButton.Visibility = Visibility.Collapsed;

            try
            {
                DownloadStateText.Text = "CHECKING CONTENT MANIFEST";
                TopStateText.Text = "CHECKING";
                _manifest = await ApiClient.GetContentManifestAsync(SessionStore.ConsoleToken);

                if (_manifest == null || !_manifest.Available || string.IsNullOrWhiteSpace(_manifest.Url))
                {
                    DownloadStateText.Text = "CONTENT SOURCE NOT CONFIGURED";
                    TopStateText.Text = "WAITING";
                    DetailText.Text = _manifest?.Reason ?? "The Project Zero content endpoint is not available yet.";
                    RetryButton.Visibility = Visibility.Visible;
                    return;
                }

                VersionValue.Text = string.IsNullOrWhiteSpace(_manifest.Build) ? "7.00" : _manifest.Build;
                ClValue.Text = string.IsNullOrWhiteSpace(_manifest.Cl) ? "4629139" : _manifest.Cl;
                FileValue.Text = _manifest.FileName ?? "content.pkg";
                BytesText.Text = "0 MB / " + FormatBytes(_manifest.Size);

                if (await ContentStore.IsInstalledAsync(_manifest))
                {
                    MarkReady();
                    return;
                }

                await StartDownloadAsync();
            }
            catch (Exception ex)
            {
                ShowFailure("CONTENT SERVICE ERROR", ex.Message);
            }
            finally
            {
                _busy = false;
            }
        }

        private async Task StartDownloadAsync()
        {
            if (_manifest == null || string.IsNullOrWhiteSpace(_manifest.Url)) return;

            _downloadCts?.Cancel();
            _downloadCts = new CancellationTokenSource();
            RetryButton.Visibility = Visibility.Collapsed;
            ContinueButton.Visibility = Visibility.Collapsed;
            CancelButton.Visibility = Visibility.Visible;
            IntegrityValue.Text = "PENDING";
            DownloadStateText.Text = "DOWNLOADING SEASON 7 CONTENT";
            TopStateText.Text = "DOWNLOADING";

            try
            {
                var progress = new Progress<DownloadSnapshot>(p =>
                {
                    var percent = Math.Max(0, Math.Min(100, p.Percent));
                    DownloadProgressFill.Width = 7.0 * percent;
                    PercentText.Text = percent.ToString("0.0") + "%";
                    BytesText.Text = FormatBytes(p.Received) + " / " +
                                     (p.Total > 0 ? FormatBytes(p.Total) : FormatBytes(_manifest.Size));
                    DownloadStateText.Text = "DOWNLOADING · " + (p.Status ?? "RUNNING").ToUpperInvariant();
                });

                var file = await ContentDownloader.DownloadAsync(
                    new Uri(_manifest.Url),
                    _manifest.FileName ?? "season7-content.pkg",
                    progress,
                    _downloadCts.Token);

                DownloadProgressFill.Width = 700;
                PercentText.Text = "100%";
                DownloadStateText.Text = "VERIFYING PACKAGE";
                TopStateText.Text = "VERIFYING";
                IntegrityValue.Text = "VERIFYING";
                CancelButton.Visibility = Visibility.Collapsed;

                var valid = await ContentStore.VerifyAsync(file, _manifest);
                if (!valid)
                {
                    try { await file.DeleteAsync(StorageDeleteOption.PermanentDelete); } catch { }
                    ShowFailure("INTEGRITY CHECK FAILED", "The downloaded package did not match the expected size or SHA-256 hash.");
                    return;
                }

                ContentStore.MarkInstalled(_manifest);
                IntegrityValue.Text = "VERIFIED";
                IntegrityValue.Foreground = (Brush)Application.Current.Resources["PzOkBrush"];
                MarkReady();
            }
            catch (TaskCanceledException)
            {
                DownloadStateText.Text = "DOWNLOAD CANCELLED";
                TopStateText.Text = "PAUSED";
                RetryButton.Visibility = Visibility.Visible;
                CancelButton.Visibility = Visibility.Collapsed;
            }
            catch (Exception ex)
            {
                ShowFailure("DOWNLOAD FAILED", ex.Message);
            }
        }

        private void MarkReady()
        {
            DownloadProgressFill.Width = 700;
            PercentText.Text = "100%";
            DownloadStateText.Text = "CONTENT READY";
            TopStateText.Text = "READY";
            IntegrityValue.Text = "VERIFIED";
            IntegrityValue.Foreground = (Brush)Application.Current.Resources["PzOkBrush"];
            DetailText.Text = "Season 7 content is present and verified. Continue to the Project Zero Xbox client.";
            ContinueButton.Visibility = Visibility.Visible;
            RetryButton.Visibility = Visibility.Collapsed;
            CancelButton.Visibility = Visibility.Collapsed;
            StateDot.Fill = (Brush)Application.Current.Resources["PzOkBrush"];
        }

        private void ShowFailure(string title, string detail)
        {
            DownloadStateText.Text = title;
            TopStateText.Text = "ERROR";
            DetailText.Text = detail;
            IntegrityValue.Text = "FAILED";
            RetryButton.Visibility = Visibility.Visible;
            ContinueButton.Visibility = Visibility.Collapsed;
            CancelButton.Visibility = Visibility.Collapsed;
        }

        private async void Retry_Click(object sender, RoutedEventArgs e)
        {
            if (_manifest != null && _manifest.Available && !string.IsNullOrWhiteSpace(_manifest.Url))
            {
                await StartDownloadAsync();
            }
            else
            {
                await PrepareAsync();
            }
        }

        private void Continue_Click(object sender, RoutedEventArgs e)
        {
            Frame.Navigate(typeof(HandoffPage));
        }

        private void Cancel_Click(object sender, RoutedEventArgs e)
        {
            _downloadCts?.Cancel();
        }

        private static string FormatBytes(ulong bytes)
        {
            const double kb = 1024.0;
            const double mb = kb * 1024.0;
            const double gb = mb * 1024.0;
            if (bytes >= gb) return (bytes / gb).ToString("0.00") + " GB";
            if (bytes >= mb) return (bytes / mb).ToString("0.0") + " MB";
            if (bytes >= kb) return (bytes / kb).ToString("0.0") + " KB";
            return bytes + " B";
        }
    }
}
