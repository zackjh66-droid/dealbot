using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Windows.Networking.BackgroundTransfer;
using Windows.Storage;

namespace ProjectZero.Services
{
    public sealed class DownloadSnapshot
    {
        public double Percent { get; set; }
        public ulong Received { get; set; }
        public ulong Total { get; set; }
        public string Status { get; set; }
    }

    public static class ContentDownloader
    {
        public const string SharedFolderName = "ProjectZeroContent";

        public static async Task<StorageFile> DownloadAsync(
            Uri source,
            string relativePath,
            IProgress<DownloadSnapshot> progress,
            CancellationToken cancellationToken)
        {
            if (source == null) throw new ArgumentNullException(nameof(source));
            var cleanPath = CleanRelativePath(relativePath);
            var folder = ApplicationData.Current.GetPublisherCacheFolder(SharedFolderName);
            var file = await GetOrCreateDestinationAsync(folder, cleanPath);

            var current = await BackgroundDownloader.GetCurrentDownloadsAsync();
            var normalizedSuffix = cleanPath.Replace('/', '\\');
            var existing = current.FirstOrDefault(op =>
                op.ResultFile != null &&
                !string.IsNullOrWhiteSpace(op.ResultFile.Path) &&
                op.ResultFile.Path.EndsWith(normalizedSuffix, StringComparison.OrdinalIgnoreCase));

            var handler = new Progress<DownloadOperation>(op =>
            {
                var p = op.Progress;
                var total = p.TotalBytesToReceive;
                var received = p.BytesReceived;
                progress?.Report(new DownloadSnapshot
                {
                    Received = received,
                    Total = total,
                    Percent = total > 0 ? received * 100.0 / total : 0,
                    Status = p.Status.ToString()
                });
            });

            if (existing != null)
            {
                try
                {
                    await existing.AttachAsync().AsTask(cancellationToken, handler);
                    return (StorageFile)existing.ResultFile;
                }
                catch
                {
                    try { existing.Cancel(); } catch { }
                    // The old signed URL may have expired. Start a fresh operation below using the new URL.
                    file = await GetOrCreateDestinationAsync(folder, cleanPath, true);
                }
            }

            var downloader = new BackgroundDownloader();
            downloader.SetRequestHeader("User-Agent", "ProjectZero-Xbox/1.0");
            var operation = downloader.CreateDownload(source, file);
            await operation.StartAsync().AsTask(cancellationToken, handler);
            return file;
        }

        public static async Task<StorageFile> TryGetFileAsync(string relativePath)
        {
            try
            {
                var cleanPath = CleanRelativePath(relativePath);
                var folder = ApplicationData.Current.GetPublisherCacheFolder(SharedFolderName);
                var parts = cleanPath.Split('/');
                for (var i = 0; i < parts.Length - 1; i++)
                {
                    folder = await folder.GetFolderAsync(parts[i]);
                }
                return await folder.GetFileAsync(parts[parts.Length - 1]);
            }
            catch
            {
                return null;
            }
        }

        private static async Task<StorageFile> GetOrCreateDestinationAsync(StorageFolder root, string relativePath, bool replace = false)
        {
            var parts = relativePath.Split('/');
            var folder = root;
            for (var i = 0; i < parts.Length - 1; i++)
            {
                folder = await folder.CreateFolderAsync(parts[i], CreationCollisionOption.OpenIfExists);
            }

            return await folder.CreateFileAsync(
                parts[parts.Length - 1],
                replace ? CreationCollisionOption.ReplaceExisting : CreationCollisionOption.OpenIfExists);
        }

        private static string CleanRelativePath(string value)
        {
            var path = (value ?? string.Empty).Replace('\\', '/').Trim('/');
            var parts = path.Split(new[] { '/' }, StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 0 || parts.Any(part => part == "." || part == ".." || part.Contains(":")))
            {
                throw new ArgumentException("Invalid content path", nameof(value));
            }
            return string.Join("/", parts);
        }
    }
}
