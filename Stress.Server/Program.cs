using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading.Tasks;
using Spike;
using Spike.Network;

namespace Stress.Server
{
    class Program
    {
        private readonly static StressStore Store = new StressStore();

        static void Main(string[] args)
        {
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
            Console.WriteLine("Check {0}, {1}", packet.Key, packet.Value);
            client.SendCheckInform(
                Store.Check(packet.Key, packet.Value)
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
