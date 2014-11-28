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
    /// Represents a serializable complex type Parameter.
    /// </summary>
    public partial struct Parameter
    {

        /// <summary>
        /// Gets or sets the property 'Key' of the complex type.
        /// </summary>
        public string Key;

        /// <summary>
        /// Gets or sets the property 'Value' of the complex type.
        /// </summary>
        public object Value;
    }

}