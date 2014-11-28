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