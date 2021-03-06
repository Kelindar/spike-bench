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
    /// Represents a serializable packet of type HubPublishInform.
    /// </summary>
    public sealed class HubPublishInform
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