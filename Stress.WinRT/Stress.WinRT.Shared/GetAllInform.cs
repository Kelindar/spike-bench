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
    /// Represents a serializable packet of type GetAllInform.
    /// </summary>
    public sealed class GetAllInform
    {

        /// <summary>
        /// Gets or sets the member 'Table' of the packet.
        /// </summary>
        public Parameter[] Table 
        {
            get; set; 
        }

    }



}