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
    /// Represents a connection result.
    /// </summary>
    public enum ConnectionResult
    {
        /// <summary>
        /// Represents that the connection was established.
        /// </summary>
        Connected,

        /// <summary>
        /// Repreesnts an error.
        /// </summary>
        Error
    }

    /// <summary>
    /// Represents a connection error.
    /// </summary>
    public enum ConnectionError
    {
        /// <summary>
        /// Unknown connection error has occured.
        /// </summary>
        Unknown,

        /// <summary>
        /// Represents a manual disconnection error.
        /// </summary>
        Manual,

        /// <summary>
        /// Represents a connection error during a connect.
        /// </summary>
        Connection,

        /// <summary>
        /// Represents a connection error during the receive.
        /// </summary>
        Receive,

        /// <summary>
        /// Represents a connection error during the send.
        /// </summary>
        Send
    }

    /// <summary>
    /// Represents a TCP Channel.
    /// </summary>
    /// <typeparam name="T"></typeparam>
    public abstract class TcpChannelBase<T> where T : TcpChannelBase<T>
    {
        private Socket TcpSocket;
        private Stream InnerStream;
        private object Lock = new object();


        /// <summary>
        /// An event that occurs when the channel is connected to the remote endpoint.
        /// </summary>
        public event Action<T> Connected;

        /// <summary>
        /// An event that occurs when the channel is disconnected to the remote endpoint.
        /// </summary>
        public event Action<T,ConnectionError> Disconnected;

        /// <summary>
        /// Constructs a new instance of a channel.
        /// </summary>
        /// <param name="bufferCapacity">The buffer capacity to allocate.</param>
        /// <param name="tls">Whether SSL/TLS should be used or not.</param>
        public TcpChannelBase(int bufferCapacity, bool tls)
        {
            this.BufferCapacity = bufferCapacity;
            this.TlsSecure = tls;
        }

        /// <summary>
        /// Gets the max capacity buffer size.
        /// </summary>
        public int BufferCapacity 
        {
            get;
            protected set; 
        }

        /// <summary>
        /// Whether this channel is secured with TLS/SSL.
        /// </summary>
        public bool TlsSecure
        {
            get;
            protected set;
        }

        /// <summary>
        /// This packet writer is used to serialize packets. We need to maintain
        /// the state for each thread, hence this is thread static.
        /// </summary>
        [ThreadStatic]
        private static PacketWriter PacketWriter;

        /// <summary>
        /// Gets a packet writer for the current thread.
        /// </summary>
        protected PacketWriter Writer
        {
            get 
            {
                if (PacketWriter == null)
                PacketWriter = new PacketWriter(this.BufferCapacity);
                return PacketWriter;
            }
        }

        /// <summary>
        /// Gets a packet reader for the current channel.
        /// </summary>
        protected PacketReader Reader
        {
            get;
            private set;
        }

        /// <summary>
        /// Gets whether the current channel is connected or not.
        /// </summary>
        public bool IsConnected 
        {

            get 
            {
                return (TcpSocket != null && TcpSocket.Connected);
            }
        }

        /// <summary>
        /// Connects to the specified hostname and port and start listening to it.
        /// </summary>
        /// <param name="host">The host to connect to.</param>
        /// <param name="port">The port to connect to.</param>
        /// <returns>The result of the connection.</returns>
        public async Task<ConnectionResult> Connect(string host, int port)
        {
            try
            {
                // Create a new TCP socket
                this.TcpSocket = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp);

                // Await the TCP Connect
                await Task.Factory.FromAsync(this.TcpSocket.BeginConnect, this.TcpSocket.EndConnect, host, port, null);

                if (TlsSecure)
                {
                    var sslStream = new SslStream(
                    new NetworkStream(this.TcpSocket), false, (sender, certificate, chain, sslPolicyErrors) => true 
                    );

                    // Perform SSL/TLS Authentication
                    sslStream.AuthenticateAsClient("Spike Client");
                    this.InnerStream = sslStream;
                }
                else
                {
                    this.InnerStream = new NetworkStream(this.TcpSocket);
                }

                // Allocate a reader that will wrap the buffer and handle receive
                this.Reader = new PacketReader(BufferCapacity);

                if (this.Connected != null)
                {
                    // If we are connected, invoke the connected event
                    this.Connected((T)this);
                }

                // Start receiving
                this.ReceiveLoop();
                return ConnectionResult.Connected;
            }
            catch (Exception)
            {
                return ConnectionResult.Error;
            }
        }

        /// <summary>
        /// Disconnects the channel from the remote endpoint.
        /// </summary>
        public void Disconnect()
        {
            Disconnect(ConnectionError.Manual);
        }

        #region Receive Members
        protected abstract void OnReceive(uint key);

        /// <summary>
        /// The receive loop that reads packets and invokes OnReceive().
        /// </summary>
        private async void ReceiveLoop()
        {
            while (true)
            {
                // First we need to read the siez
                this.Reader.Offset = 0;
                this.Reader.Length = await Task.Run(() => Fill(sizeof(int)));
                if (!this.Reader.CheckAvailable(sizeof(int)))
                {
                    // If we don't have at least 4 bytes, we can disconnect
                    Disconnect(ConnectionError.Receive);
                    return;
                }

                //read packet data
                this.Reader.Offset = 0;
                this.Reader.Length = this.Reader.ReadInt32() + sizeof(int);

                do
                {
                    var expect = this.Reader.Length - this.Reader.Offset;
                    var length = await Task.Run(() => Fill(expect));
                    if (length == 0)
                    {
                        // If we did not receive the expected amout of bytes, disconnect
                        Disconnect(ConnectionError.Receive);
                        return;
                    }

                    this.Reader.Offset += length;
                }
                while (this.Reader.Offset < this.Reader.Length);

                // Move the cursor back (seek)
                this.Reader.Offset = sizeof(int);

                // Now read the packet
                OnReceive(this.Reader.ReadUInt32());
            }
        }
        private int Fill(int size)
        {
            try
            {
                // Read to the packet reader
                return InnerStream.Read(this.Reader.Buffer, this.Reader.Offset, size);
            }
            catch (Exception)
            {
                return 0;
            }
        }
        #endregion

        #region Private/Protected Members
        private void Disconnect(ConnectionError error)
        {
            var mustRaise = false;
            lock (Lock)
            {
                if (TcpSocket != null)
                {
                    TcpSocket.Dispose();
                    mustRaise = true;
                    TcpSocket = null;
                }
            }

            if (mustRaise)
            Disconnected((T)this, error);            
        }


        protected async Task SendPacket(PacketWriter writer, bool compressed)
        {
            try
            {
                // Get the final buffer we should send
                var buffer = writer.Flush(compressed);
                var success = await Task.Run<bool>(() => 
                {
                    try 
                    {
                        InnerStream.Write(buffer, 0, buffer.Length);
                        return true;
                    }
                    catch(Exception)
                    {
                        return false;
                    }
                }                );

                if(!success)
                {
                    Disconnect(ConnectionError.Send);
                    return;
                }
            }
            catch (Exception)
            {
                Disconnect(ConnectionError.Unknown);
            }
        }

        #endregion

    }

}