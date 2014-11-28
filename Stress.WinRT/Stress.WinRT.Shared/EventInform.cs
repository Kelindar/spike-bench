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
    /// Represents a serializable packet of type EventInform.
    /// </summary>
    public sealed class EventInform
    {

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