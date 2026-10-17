using System;
using System.Threading.Tasks;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Navigation;
using ProjectZero.Models;
using ProjectZero.Services;

namespace ProjectZero.Pages
{
    public sealed partial class HandoffPage : Page
    {
        private TicketResult _ticket;
        private bool _running;

        public HandoffPage()
        {
            InitializeComponent();
        }

        protected override async void OnNavigatedTo(NavigationEventArgs e)
        {
            base.OnNavigatedTo(e);

            if (string.IsNullOrEmpty(SessionStore.ConsoleToken))
            {
                Frame.Navigate(typeof(LinkPage));
                return;
            }

            UsernameText.Text = (SessionStore.Username ?? "player").ToUpperInvariant();
            AccountLineText.Text = "ACCOUNT · " + (SessionStore.BuildLabel ?? "SEASON 6 / 7");
            await RunHandoffAsync();
        }

        private async Task RunHandoffAsync()
        {
            if (_running)
            {
                return;
            }

            _running = true;
            ResetUi();

            try
            {
                SetLog(LogProfile, "PROFILE MOUNTED", true);
                ProgressFill.Width = 170;
                ProgressFill.Opacity = 1;
                await Task.Delay(450);

                _ticket = await ApiClient.GetTicketAsync(SessionStore.ConsoleToken);
                var build = _ticket.Build;

                BuildText.Text = build != null
                    ? build.Version + " / " + build.Cl
                    : "DEFAULT";

                SetLog(LogBuild, "BUILD RESOLVED " + (build != null ? build.Version : "DEFAULT"), true);
                ProgressFill.Width = 340;
                StatusText.Text = "MINTING GAME TICKET";
                await Task.Delay(450);

                SetLog(LogTicket, "GAME TICKET MINTED", _ticket.Ticket != null);
                ProgressFill.Width = 470;
                StatusText.Text = "HANDING OFF TO CLIENT";
                await Task.Delay(450);

                var uri = GameLauncher.BuildUri(_ticket, build);
                var launched = await GameLauncher.TryLaunchAsync(uri, _ticket);

                SetLog(LogHandoff, launched ? "HANDOFF OK" : "CLIENT NOT INSTALLED", launched);

                if (launched)
                {
                    ProgressFill.Width = 520;
                    StatusText.Text = "CLIENT LAUNCHED";
                    ClientStateText.Text = "CLIENT RUNNING";
                    ClientStateText.Foreground = (Brush)Application.Current.Resources["PzOkBrush"];
                }
                else
                {
                    ProgressFill.Width = 320;
                    ShowClientMissing();
                }
            }
            catch (Exception)
            {
                StatusText.Text = "CONTROL PLANE ERROR";
                ClientStateText.Text = "HANDOFF INTERRUPTED";
                ClientStateText.Foreground = (Brush)Application.Current.Resources["PzMutedBrush"];
                ClientHelpText.Text = "The console could not reach the control plane. Check the network, then retry.";
                ClientHelpText.Visibility = Visibility.Visible;
                RetryButton.Visibility = Visibility.Visible;
            }
            finally
            {
                _running = false;
            }
        }

        private void ResetUi()
        {
            LogProfile.Text = "PROFILE MOUNTED";
            LogBuild.Text = "BUILD RESOLVED";
            LogTicket.Text = "GAME TICKET";
            LogHandoff.Text = "CLIENT HANDOFF";
            LogProfile.Foreground = (Brush)Application.Current.Resources["PzMutedBrush"];
            LogBuild.Foreground = (Brush)Application.Current.Resources["PzMutedBrush"];
            LogTicket.Foreground = (Brush)Application.Current.Resources["PzMutedBrush"];
            LogHandoff.Foreground = (Brush)Application.Current.Resources["PzMutedBrush"];
            ClientStateText.Text = "AWAITING HANDOFF";
            ClientStateText.Foreground = (Brush)Application.Current.Resources["PzGoldBrush"];
            ClientHelpText.Visibility = Visibility.Collapsed;
            RetryButton.Visibility = Visibility.Collapsed;
            StatusText.Text = "NEGOTIATING SESSION";
            ProgressFill.Width = 30;
        }

        private void SetLog(TextBlock block, string text, bool ok)
        {
            block.Text = text + (ok ? "  ·  OK" : "  ·  —");
            block.Foreground = (Brush)Application.Current.Resources[ok ? "PzOkBrush" : "PzMutedBrush"];
        }

        private void ShowClientMissing()
        {
            ClientStateText.Text = "CLIENT PACKAGE NOT INSTALLED";
            ClientStateText.Foreground = (Brush)Application.Current.Resources["PzGoldBrush"];
            ClientHelpText.Text =
                "Signed Season 6 or 7 UWP client package was not found. Install the client package for this " +
                "console, then retry. The launcher will hand off automatically once the protocol is registered.";
            ClientHelpText.Visibility = Visibility.Visible;
            RetryButton.Visibility = Visibility.Visible;
            StatusText.Text = "AWAITING CLIENT PACKAGE";
        }

        private async void Retry_Click(object sender, RoutedEventArgs e)
        {
            if (_ticket == null)
            {
                await RunHandoffAsync();
                return;
            }

            RetryButton.IsEnabled = false;
            try
            {
                var uri = GameLauncher.BuildUri(_ticket, _ticket.Build);
                var launched = await GameLauncher.TryLaunchAsync(uri, _ticket);
                if (launched)
                {
                    SetLog(LogHandoff, "HANDOFF OK", true);
                    StatusText.Text = "CLIENT LAUNCHED";
                    ClientStateText.Text = "CLIENT RUNNING";
                    ClientStateText.Foreground = (Brush)Application.Current.Resources["PzOkBrush"];
                    ClientHelpText.Visibility = Visibility.Collapsed;
                    RetryButton.Visibility = Visibility.Collapsed;
                }
            }
            finally
            {
                RetryButton.IsEnabled = true;
            }
        }

        private void Unlink_Click(object sender, RoutedEventArgs e)
        {
            SessionStore.Clear();
            Frame.Navigate(typeof(LinkPage));
        }
    }
}
