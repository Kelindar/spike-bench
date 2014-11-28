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