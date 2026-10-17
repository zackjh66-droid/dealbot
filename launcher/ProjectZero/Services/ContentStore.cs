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
            if (manifest == null || !manifest.Available)
            {
                return false;
            }

            try
            {
                var root = ApplicationData.Current.GetPublisherCacheFolder(ContentDownloader.SharedFolderName);
                var marker = await root.GetFileAsync(MarkerFileName);
                var markerText = await FileIO.ReadTextAsync(marker);
                var jo = JsonObject.Parse(markerText);

                var markedBuild = GetString(jo, "build");
                var markedCl = NormalizeCl(GetString(jo, "cl"));
                if (!string.Equals(markedBuild, manifest.Build, StringComparison.OrdinalIgnoreCase) ||
                    !string.Equals(markedCl, NormalizeCl(manifest.Cl), StringComparison.OrdinalIgnoreCase))
                {
                    return false;
                }

                if (IsMultiFile(manifest))
                {
                    foreach (var expected in manifest.Files)
                    {
                        if (expected == null || string.IsNullOrWhiteSpace(expected.Path)) return false;
                        var file = await ContentDownloader.TryGetFileAsync(expected.Path);
                        if (file == null) return false;
                        var props = await file.GetBasicPropertiesAsync();
                        if (expected.Size > 0 && props.Size != expected.Size) return false;
                    }
                    return true;
                }

                if (string.IsNullOrWhiteSpace(manifest.FileName)) return false;
                var markedName = GetString(jo, "fileName");
                var markedSha = GetString(jo, "sha256");
                if (!string.Equals(markedName, manifest.FileName, StringComparison.OrdinalIgnoreCase)) return false;
                if (!string.IsNullOrWhiteSpace(manifest.Sha256) &&
                    !string.Equals(markedSha, manifest.Sha256, StringComparison.OrdinalIgnoreCase)) return false;

                var legacyFile = await root.GetFileAsync(manifest.FileName);
                var legacyProps = await legacyFile.GetBasicPropertiesAsync();
                return manifest.Size == 0 || legacyProps.Size == manifest.Size;
            }
            catch
            {
                return false;
            }
        }

        public static Task<bool> VerifyAsync(StorageFile file, ContentManifest manifest)
        {
            if (manifest == null) return Task.FromResult(false);
            return VerifyCoreAsync(file, manifest.Size, manifest.Sha256);
        }

        public static Task<bool> VerifyAsync(StorageFile file, ContentFileManifest manifest)
        {
            if (manifest == null) return Task.FromResult(false);
            return VerifyCoreAsync(file, manifest.Size, manifest.Sha256);
        }

        private static async Task<bool> VerifyCoreAsync(StorageFile file, ulong expectedSize, string expectedSha256)
        {
            if (file == null) return false;

            var props = await file.GetBasicPropertiesAsync();
            if (expectedSize > 0 && props.Size != expectedSize) return false;
            if (string.IsNullOrWhiteSpace(expectedSha256)) return true;

            string actual;
            using (var stream = await file.OpenStreamForReadAsync())
            using (var sha = SHA256.Create())
            {
                var hash = await Task.Run(() => sha.ComputeHash(stream));
                actual = string.Concat(hash.Select(b => b.ToString("x2")));
            }

            return string.Equals(actual, expectedSha256.Trim(), StringComparison.OrdinalIgnoreCase);
        }

        public static async Task MarkInstalledAsync(ContentManifest manifest)
        {
            if (manifest == null) throw new ArgumentNullException(nameof(manifest));

            var settings = ApplicationData.Current.LocalSettings.Values;
            settings["content.mode"] = manifest.Mode ?? string.Empty;
            settings["content.fileName"] = manifest.FileName ?? string.Empty;
            settings["content.build"] = manifest.Build ?? string.Empty;
            settings["content.cl"] = manifest.Cl ?? string.Empty;
            settings["content.sha256"] = manifest.Sha256 ?? string.Empty;

            var root = ApplicationData.Current.GetPublisherCacheFolder(ContentDownloader.SharedFolderName);
            var marker = await root.CreateFileAsync(MarkerFileName, CreationCollisionOption.ReplaceExisting);
            var jo = new JsonObject
            {
                ["mode"] = JsonValue.CreateStringValue(IsMultiFile(manifest) ? "files" : (manifest.Mode ?? "archive")),
                ["fileName"] = JsonValue.CreateStringValue(manifest.FileName ?? string.Empty),
                ["build"] = JsonValue.CreateStringValue(manifest.Build ?? string.Empty),
                ["cl"] = JsonValue.CreateStringValue(manifest.Cl ?? string.Empty),
                ["sha256"] = JsonValue.CreateStringValue((manifest.Sha256 ?? string.Empty).ToLowerInvariant()),
                ["size"] = JsonValue.CreateNumberValue(manifest.Size),
                ["fileCount"] = JsonValue.CreateNumberValue(IsMultiFile(manifest) ? manifest.Files.Count : 1),
                ["totalSize"] = JsonValue.CreateNumberValue(IsMultiFile(manifest) ? manifest.Files.Aggregate(0UL, (sum, f) => sum + (f?.Size ?? 0)) : manifest.Size)
            };

            var files = new JsonArray();
            if (IsMultiFile(manifest))
            {
                foreach (var item in manifest.Files)
                {
                    if (item == null || string.IsNullOrWhiteSpace(item.Path)) continue;
                    files.Add(new JsonObject
                    {
                        ["path"] = JsonValue.CreateStringValue(item.Path),
                        ["size"] = JsonValue.CreateNumberValue(item.Size),
                        ["sha256"] = JsonValue.CreateStringValue((item.Sha256 ?? string.Empty).ToLowerInvariant()),
                        ["etag"] = JsonValue.CreateStringValue(item.Etag ?? string.Empty)
                    });
                }
            }
            jo["files"] = files;

            await FileIO.WriteTextAsync(marker, jo.Stringify());
        }

        private static bool IsMultiFile(ContentManifest manifest)
        {
            return manifest?.Files != null && manifest.Files.Count > 0 &&
                   string.Equals(manifest.Mode, "files", StringComparison.OrdinalIgnoreCase);
        }

        private static string NormalizeCl(string value)
        {
            var cl = (value ?? string.Empty).Trim();
            return cl.StartsWith("CL-", StringComparison.OrdinalIgnoreCase) ? cl.Substring(3) : cl;
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
