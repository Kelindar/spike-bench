using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading.Tasks;
using Spike;
using Spike.Network;
using Spike.Diagnostics;
using System.Diagnostics;

namespace Stress.Server
{
    class Program
    {
        private readonly static StressStore Store = new StressStore();

        static void Main(string[] args)
        {
            /*NetTrace.Enabled = true;
            NetTrace.Listeners.Add(new ConsoleTraceListener());
            NetTrace.TraceFabric = true;
            NetTrace.TraceSpike = true;*/
            Service.Listen(
                new TcpBinding(IPAddress.Any, 8002)
                );
        }

        [InvokeAt(InvokeAtType.Initialize)]
        public static void Initialize()
        {
            StressProtocol.GetAll += StressProtocol_GetAll;
            StressProtocol.Check += StressProtocol_Check;
            StressProtocol.Get += StressProtocol_Get;

            Store.Notify += Store_Notify;
        }

        static void Store_Notify(string msg)
        {
            foreach (var client in Service.Clients)
                client.SendEventInform(msg, DateTime.Now);
        }

        static void StressProtocol_Get(IClient client, GetRequest packet)
        {
            client.SendGetInform(Store.Get(packet.Key));
        }

        static void StressProtocol_Check(IClient client, CheckRequest packet)
        {
            //Console.WriteLine("Check {0}, {1}", packet.Key, packet.Value);
            object old;
            var result = Store.TryCheck(packet.Key, packet.Value, out old);

            if(!result){
                client.SendEventInform(
                    String.Format("[{0}] Failed to match ({1}) with ({2})", packet.Key, packet.Value, old),
                    DateTime.Now
                    );
            }
            
            client.SendCheckInform(
                packet.Key, 
                packet.Value,
                result
                );
        }

        static void StressProtocol_GetAll(IClient client)
        {
            var table = Store.GetAll()
                .Select(e => new Parameter(e.Key, e.Value))
                .OrderBy( p => p.Key)
                .ToList();

            client.SendGetAllInform(table);
        }

    }
}
