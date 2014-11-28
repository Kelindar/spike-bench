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
    /// Represents a serializable packet of type CheckInform.
    /// </summary>
    public sealed class CheckInform
    {

        /// <summary>
        /// Gets or sets the member 'Key' of the packet.
        /// </summary>
        public string Key 
        {
            get; set; 
        }


        /// <summary>
        /// Gets or sets the member 'Value' of the packet.
        /// </summary>
        public object Value 
        {
            get; set; 
        }


        /// <summary>
        /// Gets or sets the member 'Success' of the packet.
        /// </summary>
        public bool Success 
        {
            get; set; 
        }

    }


}