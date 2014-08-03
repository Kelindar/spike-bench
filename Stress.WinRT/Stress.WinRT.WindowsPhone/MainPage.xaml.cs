using Spike.Network;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices.WindowsRuntime;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Controls.Primitives;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Input;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Navigation;

// The Blank Page item template is documented at http://go.microsoft.com/fwlink/?LinkId=234238

namespace Stress.WinRT
{
    /// <summary>
    /// An empty page that can be used on its own or navigated to within a Frame.
    /// </summary>
    public sealed partial class MainPage : Page
    {
        public ObservableCollection<Message> _Messages = new ObservableCollection<Message>();
        public ObservableCollection<Message> Messages { get { return _Messages; } }

        public TcpChannel Server = new TcpChannel(100000);

        public void ConsoleWriteLine(string text)
        {
            Messages.Add(new Message() { Text = text });
        }

        public MainPage()
        {
            this.InitializeComponent();

            this.NavigationCacheMode = NavigationCacheMode.Required;

            DataContext = this;

            Server.EventInform += (sender, packet) => ConsoleWriteLine(packet.Message);
            Server.GetInform += (sender, packet) => ConsoleWriteLine(string.Format("Got: {0}", packet.Value));
            Server.CheckInform += (sender, packet) => ConsoleWriteLine(string.Format("Success: {0}", packet.Success));

            Server.GetAllInform += async (sender, packet) =>
            {
                ConsoleWriteLine("Test: Data Coherence Test...");
                foreach (var entity in packet.Table)
                    await Server.Check(entity.Key, entity.Value);
            };

            Server.Connected += async (sender) =>
            {
                ConsoleWriteLine("Connected");
                await sender.GetAll();
            };

            Server.Disconnected += (sender, error) =>
            {
                ConsoleWriteLine(string.Format("Disconnected : {0}", error));
            };
        }

        private async void ButtonConnection_Click(object sender, RoutedEventArgs e)
        {
            ButtonConnection.IsEnabled = false;
            await Server.Connect("127.0.0.1", 8002);
        }

        /// <summary>
        /// Invoked when this page is about to be displayed in a Frame.
        /// </summary>
        /// <param name="e">Event data that describes how this page was reached.
        /// This parameter is typically used to configure the page.</param>
        protected override void OnNavigatedTo(NavigationEventArgs e)
        {
            // TODO: Prepare page for display here.

            // TODO: If your application contains multiple pages, ensure that you are
            // handling the hardware Back button by registering for the
            // Windows.Phone.UI.Input.HardwareButtons.BackPressed event.
            // If you are using the NavigationHelper provided by some templates,
            // this event is handled for you.
        }
    }
}
