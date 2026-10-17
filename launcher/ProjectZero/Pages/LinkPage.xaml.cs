using System;
using System.Linq;
using System.Threading.Tasks;
using Windows.Storage.Streams;
using Windows.System;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Input;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Media.Animation;
using Windows.UI.Xaml.Media.Imaging;
using ProjectZero.Services;

namespace ProjectZero.Pages
{
    public sealed partial class LinkPage : Page
    {
        private readonly DispatcherTimer _timer = new DispatcherTimer
        {
            Interval = TimeSpan.FromSeconds(2.5)
        };

        private string _code;
        private string _pollToken;
        private bool _polling;
        private bool _busy;

        public LinkPage()
        {
            InitializeComponent();
            _timer.Tick += OnTimerTick;
            Loaded += OnLoaded;
            Unloaded += OnUnloaded;
        }

        private void OnLoaded(object sender, RoutedEventArgs e)
        {
            StartAnimations();
            RefreshButton.Focus(FocusState.Programmatic);

            if (!string.IsNullOrEmpty(SessionStore.ConsoleToken))
            {
                Frame.Navigate(typeof(HandoffPage));
                return;
            }

            var ignored = CreateLinkAsync();
        }

        private void OnUnloaded(object sender, RoutedEventArgs e)
        {
            _timer.Stop();
        }

        private void Page_KeyDown(object sender, KeyRoutedEventArgs e)
        {
            if (e.Key == VirtualKey.GamepadB || e.Key == VirtualKey.GoBack)
            {
                e.Handled = true;
                Application.Current.Exit();
            }
        }

        private void StartAnimations()
        {
            var dot = new DoubleAnimation
            {
                From = 1,
                To = 0.35,
                Duration = new Duration(TimeSpan.FromSeconds(1.1)),
                AutoReverse = true,
                RepeatBehavior = RepeatBehavior.Forever
            };
            Storyboard.SetTarget(dot, StatusDot);
            Storyboard.SetTargetProperty(dot, "Opacity");

            var slide = new DoubleAnimation
            {
                From = -150,
                To = 520,
                Duration = new Duration(TimeSpan.FromSeconds(2.4)),
                RepeatBehavior = RepeatBehavior.Forever
            };
            Storyboard.SetTarget(slide, PulseTransform);
            Storyboard.SetTargetProperty(slide, "X");

            var board = new Storyboard();
            board.Children.Add(dot);
            board.Children.Add(slide);
            board.Begin();
        }

        private async Task CreateLinkAsync()
        {
            if (_busy)
            {
                return;
            }

            _busy = true;
            _timer.Stop();
            ErrorText.Visibility = Visibility.Collapsed;
            RefreshButton.IsEnabled = false;
            QrImage.Source = null;
            QrHelpText.Text = "GENERATING A FRESH QR CODE…";
            StatusText.Text = "REQUESTING CODE";

            try
            {
                var result = await ApiClient.StartLinkAsync();
                _code = result.Code;
                _pollToken = result.PollToken;

                CodeText.Text = result.Code;
                CodeText.Foreground = (Brush)Application.Current.Resources["PzTextBrush"];
                LinkUrlText.Text = result.LinkUrl.Replace("https://", string.Empty).Replace("http://", string.Empty);

                try
                {
                    await LoadQrAsync(result.LinkUrl);
                    QrHelpText.Text = "SCAN WITH YOUR PHONE CAMERA TO OPEN THE CONSOLE-LINK PAGE.";
                }
                catch
                {
                    QrImage.Source = null;
                    QrHelpText.Text = "QR COULD NOT LOAD. USE THE SIX-CHARACTER CODE ABOVE INSTEAD.";
                }

                StatusText.Text = "WAITING FOR CLAIM";
                StatusDot.Fill = (Brush)Application.Current.Resources["PzVioletBrightBrush"];
                _timer.Start();
            }
            catch (Exception)
            {
                ShowError("CONTROL PLANE UNREACHABLE · CHECK NETWORK AND REFRESH");
                QrHelpText.Text = "QR WILL APPEAR AFTER A LINK CODE IS CREATED.";
            }
            finally
            {
                _busy = false;
                RefreshButton.IsEnabled = true;
                RefreshButton.Focus(FocusState.Programmatic);
            }
        }

        private static async Task<BitmapImage> DecodePngAsync(byte[] bytes)
        {
            if (bytes == null || bytes.Length == 0)
            {
                throw new InvalidOperationException("QR image was empty.");
            }

            using (var stream = new InMemoryRandomAccessStream())
            {
                using (var writer = new DataWriter(stream))
                {
                    writer.WriteBytes(bytes);
                    await writer.StoreAsync();
                    await writer.FlushAsync();
                    writer.DetachStream();
                }

                stream.Seek(0);
                var bitmap = new BitmapImage
                {
                    DecodePixelWidth = 640,
                    DecodePixelHeight = 640
                };
                await bitmap.SetSourceAsync(stream);
                return bitmap;
            }
        }

        private async Task LoadQrAsync(string linkUrl)
        {
            var bytes = await ApiClient.GetQrPngAsync(linkUrl);
            QrImage.Source = await DecodePngAsync(bytes);
        }

        private async void OnTimerTick(object sender, object e)
        {
            await PollAsync();
        }

        private async Task PollAsync()
        {
            if (_polling || string.IsNullOrEmpty(_code) || string.IsNullOrEmpty(_pollToken))
            {
                return;
            }

            _polling = true;
            try
            {
                var result = await ApiClient.PollAsync(_code, _pollToken);

                if (result.Status == "linked")
                {
                    _timer.Stop();
                    SessionStore.ConsoleToken = result.SessionToken;
                    SessionStore.Username = result.Account != null ? result.Account.Username : "player";
                    var first = result.Builds != null ? result.Builds.FirstOrDefault() : null;
                    SessionStore.BuildLabel = first != null ? first.BuildLabel : null;

                    StatusText.Text = "LINKED · OPENING SESSION";
                    StatusDot.Fill = (Brush)Application.Current.Resources["PzOkBrush"];
                    Frame.Navigate(typeof(HandoffPage));
                }
                else if (result.Status == "expired")
                {
                    _timer.Stop();
                    ShowError("CODE EXPIRED · REFRESH FOR A NEW CODE");
                    StatusText.Text = "STANDBY";
                }
                else if (result.Status == "invalid")
                {
                    _timer.Stop();
                    ShowError("LINK LOST · REFRESH FOR A NEW CODE");
                    StatusText.Text = "STANDBY";
                }
            }
            catch (Exception)
            {
                // Transient network failure: leave the timer running.
            }
            finally
            {
                _polling = false;
            }
        }

        private void ShowError(string message)
        {
            ErrorText.Text = message;
            ErrorText.Visibility = Visibility.Visible;
        }

        private async void Refresh_Click(object sender, RoutedEventArgs e)
        {
            if (_busy)
            {
                return;
            }

            await CreateLinkAsync();
        }
    }
}
