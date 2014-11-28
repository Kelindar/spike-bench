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
    /// Represents a serializable packet of type HubEventInform.
    /// </summary>
    public sealed class HubEventInform
    {

        /// <summary>
        /// Gets or sets the member 'HubName' of the packet.
        /// </summary>
        public string HubName 
        {
            get; set; 
        }


        /// <summary>
        /// Gets or sets the member 'Message' of the packet.
        /// </summary>
        public string Message 
        {
            get; set; 
        }


        /// <summary>
        /// Gets or sets the member 'Time' of the packet.
        /// </summary>
        public DateTime Time 
        {
            get; set; 
        }

    }


}