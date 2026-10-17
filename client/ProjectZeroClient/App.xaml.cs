using Windows.ApplicationModel.Activation;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;

namespace ProjectZeroClient
{
    sealed partial class App : Application
    {
        public App()
        {
            InitializeComponent();
            RequiresPointerMode = ApplicationRequiresPointerMode.WhenRequested;
        }

        protected override void OnLaunched(LaunchActivatedEventArgs e)
        {
            Show(e.Arguments ?? "DIRECT LAUNCH");
        }

        protected override void OnActivated(IActivatedEventArgs args)
        {
            if (args.Kind == ActivationKind.Protocol)
            {
                var p = (ProtocolActivatedEventArgs)args;
                Show(p.Uri != null ? p.Uri.ToString() : "PROTOCOL ACTIVATION");
                return;
            }
            base.OnActivated(args);
        }

        private void Show(string value)
        {
            var frame = Window.Current.Content as Frame;
            if (frame == null)
            {
                frame = new Frame();
                Window.Current.Content = frame;
            }
            frame.Navigate(typeof(ClientPage), value);
            Window.Current.Activate();
        }
    }
}
