using System;
using System.Linq;
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
        private const ulong SafetyReserveBytes = 512UL * 1024UL * 1024UL;

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
            StorageStateText.Text = "STORAGE CHECK PENDING";
            StorageStateText.Foreground = (Brush)Application.Current.Resources["PzIceBrush"];
            StorageValue.Text = "CHECKING";
            StorageValue.Foreground = (Brush)Application.Current.Resources["PzIceBrush"];
            RequiredValue.Text = "—";

            try
            {
                DownloadStateText.Text = "CHECKING CONTENT MANIFEST";
                TopStateText.Text = "CHECKING";
                _manifest = await ApiClient.GetContentManifestAsync(SessionStore.ConsoleToken);

                if (_manifest == null || !_manifest.Available || !HasUsableSource(_manifest))
                {
                    DownloadStateText.Text = "CONTENT NOT READY";
                    TopStateText.Text = "WAITING";
                    StorageStateText.Text = "WAITING FOR BUILD";
                    StorageValue.Text = "—";
                    DetailText.Text = _manifest?.Reason ?? "The finalized Season 7 content manifest is not available yet.";
                    RetryButton.Visibility = Visibility.Visible;
                    RetryButton.Focus(FocusState.Programmatic);
                    return;
                }

                VersionValue.Text = string.IsNullOrWhiteSpace(_manifest.Build) ? "7.00" : _manifest.Build;
                ClValue.Text = string.IsNullOrWhiteSpace(_manifest.Cl) ? "4629139" : _manifest.Cl;
                if (IsMultiFile(_manifest))
                {
                    FileValue.Text = _manifest.Files.Count + " FILES";
                    BytesText.Text = "0 MB / " + FormatBytes(TotalBytes(_manifest));
                    DetailText.Text = "Downloading the finalized Season 7 file set and restoring its original folder structure.";
                }
                else
                {
                    FileValue.Text = _manifest.FileName ?? "content.pkg";
                    BytesText.Text = "0 MB / " + FormatBytes(_manifest.Size);
                }

                if (await ContentStore.IsInstalledAsync(_manifest))
                {
                    RequiredValue.Text = "0 B";
                    StorageStateText.Text = "CONTENT ALREADY INSTALLED";
                    StorageStateText.Foreground = (Brush)Application.Current.Resources["PzOkBrush"];
                    var installedFree = await TryGetFreeSpaceAsync();
                    StorageValue.Text = installedFree.HasValue ? FormatBytes(installedFree.Value) : "AVAILABLE";
                    StorageValue.Foreground = (Brush)Application.Current.Resources["PzOkBrush"];
                    MarkReady();
                    return;
                }

                var missingBytes = await EstimateMissingBytesAsync(_manifest);
                RequiredValue.Text = FormatBytes(missingBytes);
                if (!await CheckStorageAsync(missingBytes))
                {
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

        private async Task<bool> CheckStorageAsync(ulong requiredBytes)
        {
            StorageStateText.Text = "CHECKING XBOX STORAGE";
            var freeBytes = await TryGetFreeSpaceAsync();

            if (!freeBytes.HasValue)
            {
                StorageValue.Text = "UNKNOWN";
                StorageStateText.Text = "STORAGE CHECK UNAVAILABLE";
                StorageStateText.Foreground = (Brush)Application.Current.Resources["PzIceBrush"];
                DetailText.Text = "Xbox did not expose a free-space value, so Project Zero will continue and Windows will still stop the download if storage runs out.";
                return true;
            }

            StorageValue.Text = FormatBytes(freeBytes.Value);
            var neededWithReserve = requiredBytes > ulong.MaxValue - SafetyReserveBytes
                ? ulong.MaxValue
                : requiredBytes + SafetyReserveBytes;

            if (freeBytes.Value < neededWithReserve)
            {
                StorageValue.Foreground = (Brush)Application.Current.Resources["PzDangerBrush"];
                StorageStateText.Text = "NOT ENOUGH SPACE";
                StorageStateText.Foreground = (Brush)Application.Current.Resources["PzDangerBrush"];
                StateDot.Fill = (Brush)Application.Current.Resources["PzDangerBrush"];
                ShowFailure(
                    "NOT ENOUGH STORAGE",
                    "This Xbox has " + FormatBytes(freeBytes.Value) + " free. Project Zero needs about " +
                    FormatBytes(requiredBytes) + " for the remaining files plus 512 MB of free headroom. Free some storage, then choose Retry.");
                return false;
            }

            StorageValue.Foreground = (Brush)Application.Current.Resources["PzOkBrush"];
            StorageStateText.Text = "ENOUGH SPACE";
            StorageStateText.Foreground = (Brush)Application.Current.Resources["PzOkBrush"];
            DetailText.Text = "Storage check passed. " + FormatBytes(freeBytes.Value) + " is free and about " +
                              FormatBytes(requiredBytes) + " remains to install. Every downloaded file will be verified before launch.";
            return true;
        }

        private static async Task<ulong?> TryGetFreeSpaceAsync()
        {
            try
            {
                var folder = ApplicationData.Current.GetPublisherCacheFolder(ContentDownloader.SharedFolderName);
                var values = await folder.Properties.RetrievePropertiesAsync(new[] { "System.FreeSpace" });
                object value;
                if (values.TryGetValue("System.FreeSpace", out value) && value != null)
                {
                    return Convert.ToUInt64(value);
                }
            }
            catch
            {
                // Some Xbox OS builds/providers may not expose System.FreeSpace to this container.
            }

            return null;
        }

        private static async Task<ulong> EstimateMissingBytesAsync(ContentManifest manifest)
        {
            if (manifest == null) return 0;

            if (IsMultiFile(manifest))
            {
                ulong missing = 0;
                foreach (var item in manifest.Files)
                {
                    if (item == null) continue;
                    var existing = await ContentDownloader.TryGetFileAsync(item.Path);
                    if (existing != null)
                    {
                        try
                        {
                            var properties = await existing.GetBasicPropertiesAsync();
                            if (properties.Size == item.Size)
                            {
                                continue;
                            }
                        }
                        catch
                        {
                            // Count it as missing when the existing file cannot be inspected.
                        }
                    }

                    missing += item.Size;
                }

                return missing;
            }

            var name = manifest.FileName ?? "season7-content.pkg";
            var archive = await ContentDownloader.TryGetFileAsync(name);
            if (archive != null)
            {
                try
                {
                    var properties = await archive.GetBasicPropertiesAsync();
                    if (properties.Size == manifest.Size)
                    {
                        return 0;
                    }
                }
                catch
                {
                }
            }

            return manifest.Size;
        }

        private async Task StartDownloadAsync()
        {
            if (_manifest == null || !HasUsableSource(_manifest)) return;

            _downloadCts?.Cancel();
            _downloadCts = new CancellationTokenSource();
            RetryButton.Visibility = Visibility.Collapsed;
            ContinueButton.Visibility = Visibility.Collapsed;
            CancelButton.Visibility = Visibility.Visible;
            CancelButton.Focus(FocusState.Programmatic);
            IntegrityValue.Text = "PENDING";
            DownloadStateText.Text = "DOWNLOADING SEASON 7 CONTENT";
            TopStateText.Text = "DOWNLOADING";

            try
            {
                if (IsMultiFile(_manifest))
                {
                    await DownloadFileSetAsync();
                }
                else
                {
                    await DownloadArchiveAsync();
                }
            }
            catch (TaskCanceledException)
            {
                DownloadStateText.Text = "DOWNLOAD CANCELLED";
                TopStateText.Text = "PAUSED";
                RetryButton.Visibility = Visibility.Visible;
                CancelButton.Visibility = Visibility.Collapsed;
                RetryButton.Focus(FocusState.Programmatic);
            }
            catch (Exception ex)
            {
                ShowFailure("DOWNLOAD FAILED", ex.Message);
            }
        }

        private async Task DownloadFileSetAsync()
        {
            var total = TotalBytes(_manifest);
            ulong completedBytes = 0;
            var totalFiles = _manifest.Files.Count;

            for (var index = 0; index < totalFiles; index++)
            {
                _downloadCts.Token.ThrowIfCancellationRequested();
                var item = _manifest.Files[index];
                if (item == null || string.IsNullOrWhiteSpace(item.Path) || string.IsNullOrWhiteSpace(item.Url))
                {
                    throw new InvalidOperationException("Content manifest contains an invalid file entry.");
                }

                var existing = await ContentDownloader.TryGetFileAsync(item.Path);
                if (existing != null && await ContentStore.VerifyAsync(existing, item))
                {
                    completedBytes += item.Size;
                    UpdateAggregateProgress(completedBytes, total, index + 1, totalFiles, item.Path, "VERIFIED");
                    continue;
                }

                var baseCompleted = completedBytes;
                var progress = new Progress<DownloadSnapshot>(p =>
                {
                    var aggregate = baseCompleted + p.Received;
                    UpdateAggregateProgress(aggregate, total, index + 1, totalFiles, item.Path, p.Status ?? "RUNNING");
                });

                var file = await ContentDownloader.DownloadAsync(
                    new Uri(item.Url),
                    item.Path,
                    progress,
                    _downloadCts.Token);

                DownloadStateText.Text = "VERIFYING " + (index + 1) + " / " + totalFiles;
                TopStateText.Text = "VERIFYING";
                IntegrityValue.Text = "VERIFYING";

                if (!await ContentStore.VerifyAsync(file, item))
                {
                    try { await file.DeleteAsync(StorageDeleteOption.PermanentDelete); } catch { }
                    ShowFailure("INTEGRITY CHECK FAILED", "Downloaded file did not match the manifest: " + item.Path);
                    return;
                }

                completedBytes += item.Size;
                UpdateAggregateProgress(completedBytes, total, index + 1, totalFiles, item.Path, "VERIFIED");
            }

            CancelButton.Visibility = Visibility.Collapsed;
            await ContentStore.MarkInstalledAsync(_manifest);
            IntegrityValue.Text = "VERIFIED";
            IntegrityValue.Foreground = (Brush)Application.Current.Resources["PzOkBrush"];
            MarkReady();
        }

        private async Task DownloadArchiveAsync()
        {
            var progress = new Progress<DownloadSnapshot>(p =>
            {
                var percent = Math.Max(0, Math.Min(100, p.Percent));
                SetProgress(percent);
                PercentText.Text = percent.ToString("0.0") + "%";
                BytesText.Text = FormatBytes(p.Received) + " / " +
                                 (p.Total > 0 ? FormatBytes(p.Total) : FormatBytes(_manifest.Size));
                DownloadStateText.Text = "DOWNLOADING / " + (p.Status ?? "RUNNING").ToUpperInvariant();
            });

            var file = await ContentDownloader.DownloadAsync(
                new Uri(_manifest.Url),
                _manifest.FileName ?? "season7-content.pkg",
                progress,
                _downloadCts.Token);

            SetProgress(100);
            PercentText.Text = "100%";
            DownloadStateText.Text = "VERIFYING PACKAGE";
            TopStateText.Text = "VERIFYING";
            IntegrityValue.Text = "VERIFYING";
            CancelButton.Visibility = Visibility.Collapsed;

            if (!await ContentStore.VerifyAsync(file, _manifest))
            {
                try { await file.DeleteAsync(StorageDeleteOption.PermanentDelete); } catch { }
                ShowFailure("INTEGRITY CHECK FAILED", "The downloaded package did not match the expected size or SHA-256 hash.");
                return;
            }

            await ContentStore.MarkInstalledAsync(_manifest);
            IntegrityValue.Text = "VERIFIED";
            IntegrityValue.Foreground = (Brush)Application.Current.Resources["PzOkBrush"];
            MarkReady();
        }

        private void UpdateAggregateProgress(ulong received, ulong total, int fileNumber, int fileCount, string path, string status)
        {
            var percent = total > 0 ? Math.Max(0, Math.Min(100, received * 100.0 / total)) : 0;
            SetProgress(percent);
            PercentText.Text = percent.ToString("0.0") + "%";
            BytesText.Text = FormatBytes(received) + " / " + FormatBytes(total);
            FileValue.Text = fileNumber + " / " + fileCount;
            DownloadStateText.Text = (status ?? "RUNNING").ToUpperInvariant() + " / " + ShortPath(path);
            TopStateText.Text = "DOWNLOADING";
        }

        private void SetProgress(double percent)
        {
            var width = ProgressTrack.ActualWidth > 0 ? ProgressTrack.ActualWidth : 650.0;
            DownloadProgressFill.Width = width * Math.Max(0, Math.Min(100, percent)) / 100.0;
        }

        private void MarkReady()
        {
            SetProgress(100);
            PercentText.Text = "100%";
            DownloadStateText.Text = "CONTENT READY";
            TopStateText.Text = "READY";
            IntegrityValue.Text = "VERIFIED";
            IntegrityValue.Foreground = (Brush)Application.Current.Resources["PzOkBrush"];
            StorageStateText.Text = "INSTALL READY";
            StorageStateText.Foreground = (Brush)Application.Current.Resources["PzOkBrush"];
            DetailText.Text = IsMultiFile(_manifest)
                ? "Season 7 files are restored in their original folder layout and verified. Continue to the Xbox client."
                : "Season 7 content is present and verified. Continue to the Xbox client.";
            ContinueButton.Visibility = Visibility.Visible;
            RetryButton.Visibility = Visibility.Collapsed;
            CancelButton.Visibility = Visibility.Collapsed;
            StateDot.Fill = (Brush)Application.Current.Resources["PzOkBrush"];
            ContinueButton.Focus(FocusState.Programmatic);
        }

        private void ShowFailure(string title, string detail)
        {
            DownloadStateText.Text = title;
            TopStateText.Text = "ERROR";
            DetailText.Text = detail;
            IntegrityValue.Text = "FAILED";
            IntegrityValue.Foreground = (Brush)Application.Current.Resources["PzDangerBrush"];
            StateDot.Fill = (Brush)Application.Current.Resources["PzDangerBrush"];
            RetryButton.Visibility = Visibility.Visible;
            ContinueButton.Visibility = Visibility.Collapsed;
            CancelButton.Visibility = Visibility.Collapsed;
            RetryButton.Focus(FocusState.Programmatic);
        }

        private async void Retry_Click(object sender, RoutedEventArgs e)
        {
            await PrepareAsync();
        }

        private void Continue_Click(object sender, RoutedEventArgs e)
        {
            Frame.Navigate(typeof(HandoffPage));
        }

        private void Cancel_Click(object sender, RoutedEventArgs e)
        {
            _downloadCts?.Cancel();
        }

        private static bool IsMultiFile(ContentManifest manifest)
        {
            return manifest?.Files != null && manifest.Files.Count > 0 &&
                   string.Equals(manifest.Mode, "files", StringComparison.OrdinalIgnoreCase);
        }

        private static bool HasUsableSource(ContentManifest manifest)
        {
            return IsMultiFile(manifest) || !string.IsNullOrWhiteSpace(manifest?.Url);
        }

        private static ulong TotalBytes(ContentManifest manifest)
        {
            if (manifest == null) return 0;
            if (manifest.TotalSize > 0) return manifest.TotalSize;
            if (manifest.Files != null) return manifest.Files.Aggregate(0UL, (sum, item) => sum + (item?.Size ?? 0));
            return manifest.Size;
        }

        private static string ShortPath(string path)
        {
            if (string.IsNullOrWhiteSpace(path)) return "FILE";
            return path.Length <= 48 ? path : "…" + path.Substring(path.Length - 47);
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
