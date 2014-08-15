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

        public ObservableCollection<string> _Messages = new ObservableCollection<string>();
        public ObservableCollection<string> Messages { get { return _Messages; } }

        public TcpChannel Server = new TcpChannel(100000);

        public void ConsoleWriteLine(string text)
        {
            Messages.Add(text);
        }

        public MainPage()
        {
            this.InitializeComponent();
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
                
    }
}
