using System;
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
        public static async Task<StorageFile> DownloadAsync(
            Uri source,
            string fileName,
            IProgress<DownloadSnapshot> progress,
            CancellationToken cancellationToken)
        {
            var folder = await ApplicationData.Current.LocalFolder.CreateFolderAsync(
                "GameContent", CreationCollisionOption.OpenIfExists);
            var file = await folder.CreateFileAsync(fileName, CreationCollisionOption.ReplaceExisting);

            var downloader = new BackgroundDownloader();
            downloader.SetRequestHeader("User-Agent", "ProjectZero-Xbox/1.0");
            var operation = downloader.CreateDownload(source, file);

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

            await operation.StartAsync().AsTask(cancellationToken, handler);
            return file;
        }
    }
}
