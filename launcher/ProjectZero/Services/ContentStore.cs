using System;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Threading.Tasks;
using Windows.Storage;
using ProjectZero.Models;

namespace ProjectZero.Services
{
    public static class ContentStore
    {
        public static async Task<bool> IsInstalledAsync(ContentManifest manifest)
        {
            if (manifest == null || string.IsNullOrWhiteSpace(manifest.FileName))
            {
                return false;
            }

            var settings = ApplicationData.Current.LocalSettings.Values;
            var installedName = settings["content.fileName"] as string;
            var installedBuild = settings["content.build"] as string;
            var installedSha = settings["content.sha256"] as string;

            if (!string.Equals(installedName, manifest.FileName, StringComparison.OrdinalIgnoreCase) ||
                !string.Equals(installedBuild, manifest.Build, StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            if (!string.IsNullOrWhiteSpace(manifest.Sha256) &&
                !string.Equals(installedSha, manifest.Sha256, StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            try
            {
                var folder = ApplicationData.Current.GetPublisherCacheFolder(ContentDownloader.SharedFolderName);
                var file = await folder.GetFileAsync(manifest.FileName);
                var props = await file.GetBasicPropertiesAsync();
                return manifest.Size == 0 || props.Size == manifest.Size;
            }
            catch
            {
                return false;
            }
        }

        public static async Task<bool> VerifyAsync(StorageFile file, ContentManifest manifest)
        {
            if (file == null || manifest == null)
            {
                return false;
            }

            var props = await file.GetBasicPropertiesAsync();
            if (manifest.Size > 0 && props.Size != manifest.Size)
            {
                return false;
            }

            if (string.IsNullOrWhiteSpace(manifest.Sha256))
            {
                return true;
            }

            string actual;
            using (var stream = await file.OpenStreamForReadAsync())
            using (var sha = SHA256.Create())
            {
                var hash = await Task.Run(() => sha.ComputeHash(stream));
                actual = string.Concat(hash.Select(b => b.ToString("x2")));
            }

            return string.Equals(actual, manifest.Sha256.Trim(), StringComparison.OrdinalIgnoreCase);
        }

        public static void MarkInstalled(ContentManifest manifest)
        {
            var settings = ApplicationData.Current.LocalSettings.Values;
            settings["content.fileName"] = manifest.FileName ?? string.Empty;
            settings["content.build"] = manifest.Build ?? string.Empty;
            settings["content.cl"] = manifest.Cl ?? string.Empty;
            settings["content.sha256"] = manifest.Sha256 ?? string.Empty;
        }
    }
}
