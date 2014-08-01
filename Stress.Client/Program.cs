using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Spike.Network;

namespace Stress.Client
{
    class Program
    {
        static Timer Timer;
        static TcpChannel Server;
        static void Main(string[] args)
        {
            Console.WriteLine("Press any key to start..");
            Console.ReadKey();

            Server = new TcpChannel();


            Timer = new Timer(OnTick, null, TimeSpan.Zero, TimeSpan.FromMilliseconds(50));

            Server.EventInform += (s, e) => Console.WriteLine(e.Data.Message);
            Server.GetInform += (s, e) => Console.WriteLine("Got: {0}", e.Data.Value);
            //Server.CheckInform += (s, e) => Console.WriteLine(e.Data.Success);

            Server.GetAllInform += (s, e) =>
            {
                Console.WriteLine("Test: Data Coherence Test...");
                foreach (var entity in e.Data.Table)
                {
                    // Check the entity
                    Server.Check(entity.Key, entity.Value);
                }
            };

            Server.Connected += (s, e) =>
            {
                Server.GetAll();
            };
            Server.Connect("127.0.0.1", 8002);

            Console.WriteLine("Press any key to exit..");
            Console.ReadKey();

        }

        static void OnTick(object o)
        {
            Server.Receive();
        }

    }
}
