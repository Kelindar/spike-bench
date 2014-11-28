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
    /// Represents a serializable packet of type HubUnsubscribeInform.
    /// </summary>
    public sealed class HubUnsubscribeInform
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