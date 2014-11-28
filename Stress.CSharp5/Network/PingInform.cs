using System;
using System.Text;
using System.Threading.Tasks;
using System.Net.Sockets;
using System.IO;
using System.Net.Security;
using System.Diagnostics;

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