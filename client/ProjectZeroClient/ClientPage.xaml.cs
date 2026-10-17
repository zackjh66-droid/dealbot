using System;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Navigation;

namespace ProjectZeroClient
{
    public sealed partial class ClientPage : Page
    {
        public ClientPage() { InitializeComponent(); }
        protected override void OnNavigatedTo(NavigationEventArgs e)
        {
            base.OnNavigatedTo(e);
            var raw = e.Parameter as string ?? "";
            try
            {
                var uri = new Uri(raw);
                // Do not display the bearer ticket on-screen; prove receipt using non-secret fields only.
                var query = uri.Query;
                PayloadText.Text = "scheme=" + uri.Scheme + "\nactivation=OK\nquery_received=" + (!string.IsNullOrEmpty(query));
            }
            catch { PayloadText.Text = raw; }
        }
    }
}