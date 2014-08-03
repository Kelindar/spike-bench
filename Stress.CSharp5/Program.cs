using Spike.Network;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Stress.CSharp5
{
    class Program
    {
        static void Main(string[] args)
        {  
            var Server = new TcpChannel(1000000);

                        
            Server.EventInform += (sender, packet) => Console.WriteLine(packet.Message); 
            Server.GetInform += (sender, packet) => Console.WriteLine("Got: {0}", packet.Value); 
            Server.CheckInform += (sender, packet) => Console.WriteLine("Success: {0}", packet.Success); 

            Server.GetAllInform += async (sender, packet) =>
            {
                Console.WriteLine("Test: Data Coherence Test...");
                foreach (var entity in packet.Table)
                    await Server.Check(entity.Key, entity.Value); 
            };

            Server.Connected += async (sender) =>
            {
                Console.WriteLine("Connected");
                await sender.GetAll();
            };

            Server.Disconnected += (sender, error) =>
            {
                Console.WriteLine("Disconnected : {0}", error);
            };

            Task.Run(async () => await Server.Connect("127.0.0.1", 8002));

            Console.WriteLine("Press any key to exit..");
            Console.ReadKey();
        }
    }
}
