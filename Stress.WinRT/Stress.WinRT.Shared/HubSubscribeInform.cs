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
    /// Represents a serializable packet of type HubSubscribeInform.
    /// </summary>
    public sealed class HubSubscribeInform
    {

        /// <summary>
        /// Gets or sets the member 'Status' of the packet.
        /// </summary>
        public short Status 
        {
            get; set; 
        }

    }



}