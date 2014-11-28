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
    /// Represents a serializable packet of type GetInform.
    /// </summary>
    public sealed class GetInform
    {

        /// <summary>
        /// Gets or sets the member 'Value' of the packet.
        /// </summary>
        public object Value 
        {
            get; set; 
        }

    }



}