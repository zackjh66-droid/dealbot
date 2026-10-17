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
            string fileName,
            IProgress<DownloadSnapshot> progress,
            CancellationToken cancellationToken)
        {
            var folder = ApplicationData.Current.GetPublisherCacheFolder(SharedFolderName);

            var current = await BackgroundDownloader.GetCurrentDownloadsAsync();
            var existing = current.FirstOrDefault(op =>
                op.ResultFile != null &&
                string.Equals(op.ResultFile.Name, fileName, StringComparison.OrdinalIgnoreCase) &&
                op.RequestedUri != null &&
                string.Equals(op.RequestedUri.AbsoluteUri, source.AbsoluteUri, StringComparison.OrdinalIgnoreCase));

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
                await existing.AttachAsync().AsTask(cancellationToken, handler);
                return (StorageFile)existing.ResultFile;
            }

            var file = await folder.CreateFileAsync(fileName, CreationCollisionOption.ReplaceExisting);
            var downloader = new BackgroundDownloader();
            downloader.SetRequestHeader("User-Agent", "ProjectZero-Xbox/1.0");
            var operation = downloader.CreateDownload(source, file);
            await operation.StartAsync().AsTask(cancellationToken, handler);
            return file;
        }
    }
}
