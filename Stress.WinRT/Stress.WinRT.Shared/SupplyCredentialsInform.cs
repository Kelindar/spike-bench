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
    /// Represents a serializable packet of type SupplyCredentialsInform.
    /// </summary>
    public sealed class SupplyCredentialsInform
    {

        /// <summary>
        /// Gets or sets the member 'Result' of the packet.
        /// </summary>
        public bool Result 
        {
            get; set; 
        }

    }



}