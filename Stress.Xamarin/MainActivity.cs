using System;

using Android.App;
using Android.Content;
using Android.Runtime;
using Android.Views;
using Android.Widget;
using Android.OS;
using Spike.Network;

namespace Stress.Xamarin
{
	[Activity (Label = "Stress.Xamarin", MainLauncher = true, Icon = "@drawable/icon")]
	public class MainActivity : Activity
	{
		protected TcpChannel Server = new TcpChannel(100000);
		protected Button SendButton;
		protected LinearLayout MessagesLayout;

		public void ConsoleWriteLine(string text) {
			var view = new TextView(this.BaseContext);
			view.Text = text;
			MessagesLayout.AddView(view);
		}

		protected override void OnCreate (Bundle bundle)
		{
			base.OnCreate (bundle);

			// Set our view from the "main" layout resource
			SetContentView (Resource.Layout.Main);

			SendButton = FindViewById<Button>(Resource.Id.ConnectButton);
			MessagesLayout = FindViewById<LinearLayout>(Resource.Id.MessagesLayout);

			Console.WriteLine( "Start") ;

			Server.EventInform += (sender, packet) => ConsoleWriteLine(packet.Message);
			Server.GetInform += (sender, packet) => ConsoleWriteLine(string.Format("Got: {0}", packet.Value));
			Server.CheckInform += (sender, packet) => ConsoleWriteLine(string.Format("Success: {0}", packet.Success));

			Server.GetAllInform += async (sender, packet) =>
			{
				ConsoleWriteLine("Test: Data Coherence Test...");
				foreach (var entity in packet.Table)                
					await Server.Check(entity.Key, entity.Value);   
				ConsoleWriteLine("Finished");
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


			SendButton.Click += async (sender, e) => {
				SendButton.Activated = false;
				await Server.Connect("10.0.0.5", 8002);
				//await Server.Connect("127.0.0.1", 8002);
			};
		}
	}
}


