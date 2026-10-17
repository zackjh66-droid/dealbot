using System;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Threading.Tasks;
using Windows.Data.Json;
using Windows.Storage;
using ProjectZero.Models;

namespace ProjectZero.Services
{
    public static class ContentStore
    {
        public const string MarkerFileName = "projectzero-content.json";

        public static async Task<bool> IsInstalledAsync(ContentManifest manifest)
        {
            if (manifest == null || string.IsNullOrWhiteSpace(manifest.FileName))
            {
                return false;
            }

            try
            {
                var folder = ApplicationData.Current.GetPublisherCacheFolder(ContentDownloader.SharedFolderName);
                var marker = await folder.GetFileAsync(MarkerFileName);
                var markerText = await FileIO.ReadTextAsync(marker);
                var jo = JsonObject.Parse(markerText);

                var markedName = GetString(jo, "fileName");
                var markedBuild = GetString(jo, "build");
                var markedSha = GetString(jo, "sha256");

                if (!string.Equals(markedName, manifest.FileName, StringComparison.OrdinalIgnoreCase) ||
                    !string.Equals(markedBuild, manifest.Build, StringComparison.OrdinalIgnoreCase))
                {
                    return false;
                }

                if (!string.IsNullOrWhiteSpace(manifest.Sha256) &&
                    !string.Equals(markedSha, manifest.Sha256, StringComparison.OrdinalIgnoreCase))
                {
                    return false;
                }

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

        public static async Task MarkInstalledAsync(ContentManifest manifest)
        {
            if (manifest == null)
            {
                throw new ArgumentNullException(nameof(manifest));
            }

            var settings = ApplicationData.Current.LocalSettings.Values;
            settings["content.fileName"] = manifest.FileName ?? string.Empty;
            settings["content.build"] = manifest.Build ?? string.Empty;
            settings["content.cl"] = manifest.Cl ?? string.Empty;
            settings["content.sha256"] = manifest.Sha256 ?? string.Empty;

            var folder = ApplicationData.Current.GetPublisherCacheFolder(ContentDownloader.SharedFolderName);
            var marker = await folder.CreateFileAsync(MarkerFileName, CreationCollisionOption.ReplaceExisting);
            var jo = new JsonObject
            {
                ["fileName"] = JsonValue.CreateStringValue(manifest.FileName ?? string.Empty),
                ["build"] = JsonValue.CreateStringValue(manifest.Build ?? string.Empty),
                ["cl"] = JsonValue.CreateStringValue(manifest.Cl ?? string.Empty),
                ["sha256"] = JsonValue.CreateStringValue((manifest.Sha256 ?? string.Empty).ToLowerInvariant()),
                ["size"] = JsonValue.CreateNumberValue(manifest.Size)
            };
            await FileIO.WriteTextAsync(marker, jo.Stringify());
        }

        private static string GetString(JsonObject jo, string key)
        {
            IJsonValue value;
            if (jo.TryGetValue(key, out value) && value.ValueType == JsonValueType.String)
            {
                return value.GetString();
            }

            return null;
        }
    }
}
