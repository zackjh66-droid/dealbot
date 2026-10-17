using System;
using Windows.ApplicationModel;
using Windows.ApplicationModel.Activation;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Navigation;
using ProjectZero.Pages;

namespace ProjectZero
{
    sealed partial class App : Application
    {
        private Frame _rootFrame;

        public App()
        {
            InitializeComponent();
            Suspending += OnSuspending;
        }

        protected override void OnLaunched(LaunchActivatedEventArgs e)
        {
            _rootFrame = Window.Current.Content as Frame;

            if (_rootFrame == null)
            {
                _rootFrame = new Frame();
                _rootFrame.NavigationFailed += OnNavigationFailed;
                Window.Current.Content = _rootFrame;
            }

            if (!e.PrelaunchActivated)
            {
                if (_rootFrame.Content == null)
                {
                    _rootFrame.Navigate(typeof(LinkPage), e.Arguments);
                }

                Window.Current.Activate();
            }
        }

        private void OnNavigationFailed(object sender, NavigationFailedEventArgs e)
        {
            throw new Exception("Failed to load page " + e.SourcePageType.FullName);
        }

        private void OnSuspending(object sender, SuspendingEventArgs e)
        {
            var deferral = e.SuspendingOperation.GetDeferral();
            deferral.Complete();
        }
    }
}
