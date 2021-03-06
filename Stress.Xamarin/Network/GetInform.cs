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