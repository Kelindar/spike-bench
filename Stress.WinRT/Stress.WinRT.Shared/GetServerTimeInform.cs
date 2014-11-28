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
    /// Represents a serializable packet of type GetServerTimeInform.
    /// </summary>
    public sealed class GetServerTimeInform
    {

        /// <summary>
        /// Gets or sets the member 'ServerTime' of the packet.
        /// </summary>
        public DateTime ServerTime 
        {
            get; set; 
        }

    }



}