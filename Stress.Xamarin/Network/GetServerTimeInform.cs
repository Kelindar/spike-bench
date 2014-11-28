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