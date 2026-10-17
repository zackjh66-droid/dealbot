using System;
using System.Linq;
using Windows.Storage;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Navigation;

namespace ProjectZeroClient
{
    public sealed partial class ClientPage : Page
    {
        public ClientPage() { InitializeComponent(); }

        protected override async void OnNavigatedTo(NavigationEventArgs e)
        {
            base.OnNavigatedTo(e);
            var raw = e.Parameter as string ?? "";

            string protocolState;
            try
            {
                var uri = new Uri(raw);
                protocolState = "scheme=" + uri.Scheme +
                                "\nactivation=OK" +
                                "\nquery_received=" + (!string.IsNullOrEmpty(uri.Query));
            }
            catch
            {
                protocolState = "activation=DIRECT";
            }

            string contentState;
            try
            {
                var folder = ApplicationData.Current.GetPublisherCacheFolder("ProjectZeroContent");
                var files = await folder.GetFilesAsync();
                if (files.Count == 0)
                {
                    contentState = "content=NOT_FOUND";
                }
                else
                {
                    var file = files.First();
                    var props = await file.GetBasicPropertiesAsync();
                    contentState = "content=FOUND" +
                                   "\ncontent_file=" + file.Name +
                                   "\ncontent_bytes=" + props.Size;
                }
            }
            catch (Exception ex)
            {
                contentState = "content=UNAVAILABLE\ncontent_error=" + ex.GetType().Name;
            }

            PayloadText.Text = protocolState + "\n" + contentState;
        }
    }
}