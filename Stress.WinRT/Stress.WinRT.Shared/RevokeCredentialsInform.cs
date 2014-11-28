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
    /// Represents a serializable packet of type RevokeCredentialsInform.
    /// </summary>
    public sealed class RevokeCredentialsInform
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