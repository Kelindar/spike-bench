using System;
using System.Diagnostics;
using System.Text;
using System.Threading.Tasks;
using Windows.Networking;
using Windows.Networking.Sockets;
using Windows.Storage.Streams;

namespace Spike.Network
{

    /// <summary>
    /// Represents a serializable packet of type PingInform.
    /// </summary>
    public sealed class PingInform
    {

        /// <summary>
        /// Gets or sets the member 'Pong' of the packet.
        /// </summary>
        public bool Pong 
        {
            get; set; 
        }

    }



}