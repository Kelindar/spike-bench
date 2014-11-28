using System;
using System.Diagnostics;
using System.Text;
using System.Threading.Tasks;
using Windows.Networking;
using Windows.Networking.Sockets;
using Windows.Storage.Streams;

namespace Spike.Network
{
    public class TcpChannel : TcpChannelBase<TcpChannel>
    {
        public TcpChannel(int bufferSize = 8096, bool useSSL=false) : base(bufferSize, useSSL)
        {
        }

        //Events

        public event Action<TcpChannel, GetAllInform> GetAllInform; 

        public event Action<TcpChannel, CheckInform> CheckInform; 

        public event Action<TcpChannel, GetInform> GetInform; 

        public event Action<TcpChannel, EventInform> EventInform; 

        public event Action<TcpChannel, PingInform> PingInform; 

        public event Action<TcpChannel, GetServerTimeInform> GetServerTimeInform; 

        public event Action<TcpChannel, SupplyCredentialsInform> SupplyCredentialsInform; 

        public event Action<TcpChannel, RevokeCredentialsInform> RevokeCredentialsInform; 

        public event Action<TcpChannel, HubSubscribeInform> HubSubscribeInform; 

        public event Action<TcpChannel, HubUnsubscribeInform> HubUnsubscribeInform; 

        public event Action<TcpChannel, HubPublishInform> HubPublishInform; 

        public event Action<TcpChannel, HubEventInform> HubEventInform; 

        //Sends        

        public async Task GetAll()
        {
            this.Writer.Begin(0xB22E7270u);
            await SendPacket(this.Writer, false);
        }

        public async Task Check(string Key, object Value)
        {
            this.Writer.Begin(0x70D7B183u);
            this.Writer.Write(Key);
            this.Writer.Write(Value);
            await SendPacket(this.Writer, false);
        }

        public async Task Get(string Key)
        {
            this.Writer.Begin(0x3E05ECEEu);
            this.Writer.Write(Key);
            await SendPacket(this.Writer, false);
        }

        public async Task Ping()
        {
            this.Writer.Begin(0x26792C94u);
            await SendPacket(this.Writer, false);
        }

        public async Task GetServerTime()
        {
            this.Writer.Begin(0x33E7FBD1u);
            await SendPacket(this.Writer, false);
        }

        public async Task SupplyCredentials(string CredentialsUri, string CredentialsType, string UserName, string Password, string Domain)
        {
            this.Writer.Begin(0x8D98E9FCu);
            this.Writer.Write(CredentialsUri);
            this.Writer.Write(CredentialsType);
            this.Writer.Write(UserName);
            this.Writer.Write(Password);
            this.Writer.Write(Domain);
            await SendPacket(this.Writer, true);
        }

        public async Task RevokeCredentials(string CredentialsUri, string CredentialsType)
        {
            this.Writer.Begin(0x4AC51818u);
            this.Writer.Write(CredentialsUri);
            this.Writer.Write(CredentialsType);
            await SendPacket(this.Writer, true);
        }

        public async Task HubSubscribe(string HubName, string SubscribeKey)
        {
            this.Writer.Begin(0x2DD19B9Bu);
            this.Writer.Write(HubName);
            this.Writer.Write(SubscribeKey);
            await SendPacket(this.Writer, true);
        }

        public async Task HubUnsubscribe(string HubName, string SubscribeKey)
        {
            this.Writer.Begin(0x6C63B75u);
            this.Writer.Write(HubName);
            this.Writer.Write(SubscribeKey);
            await SendPacket(this.Writer, true);
        }

        public async Task HubPublish(string HubName, string PublishKey, string Message)
        {
            this.Writer.Begin(0x96B41079u);
            this.Writer.Write(HubName);
            this.Writer.Write(PublishKey);
            this.Writer.Write(Message);
            await SendPacket(this.Writer, true);
        }

        //Dispatcher
        protected override void OnReceive(uint key)
        {
            switch (key)
            {

                case 0xB22E7270u:
                {
                    var packet = new GetAllInform();
                    this.Reader.Begin(false);

                    packet.Table = this.Reader.ReadListOfParameter();

                    //Now Call event
                    if (GetAllInform != null)
                    GetAllInform(this, packet);

                    break;
                }

                case 0x70D7B183u:
                {
                    var packet = new CheckInform();
                    this.Reader.Begin(false);

                    packet.Key = this.Reader.ReadString();
                    packet.Value = this.Reader.ReadDynamicType();
                    packet.Success = this.Reader.ReadBoolean();

                    //Now Call event
                    if (CheckInform != null)
                    CheckInform(this, packet);

                    break;
                }

                case 0x3E05ECEEu:
                {
                    var packet = new GetInform();
                    this.Reader.Begin(false);

                    packet.Value = this.Reader.ReadDynamicType();

                    //Now Call event
                    if (GetInform != null)
                    GetInform(this, packet);

                    break;
                }

                case 0xBA220D80u:
                {
                    var packet = new EventInform();
                    this.Reader.Begin(false);

                    packet.Message = this.Reader.ReadString();
                    packet.Time = this.Reader.ReadDateTime();

                    //Now Call event
                    if (EventInform != null)
                    EventInform(this, packet);

                    break;
                }

                case 0x26792C94u:
                {
                    var packet = new PingInform();
                    this.Reader.Begin(false);

                    packet.Pong = this.Reader.ReadBoolean();

                    //Now Call event
                    if (PingInform != null)
                    PingInform(this, packet);

                    break;
                }

                case 0x33E7FBD1u:
                {
                    var packet = new GetServerTimeInform();
                    this.Reader.Begin(true);

                    packet.ServerTime = this.Reader.ReadDateTime();

                    //Now Call event
                    if (GetServerTimeInform != null)
                    GetServerTimeInform(this, packet);

                    break;
                }

                case 0x8D98E9FCu:
                {
                    var packet = new SupplyCredentialsInform();
                    this.Reader.Begin(false);

                    packet.Result = this.Reader.ReadBoolean();

                    //Now Call event
                    if (SupplyCredentialsInform != null)
                    SupplyCredentialsInform(this, packet);

                    break;
                }

                case 0x4AC51818u:
                {
                    var packet = new RevokeCredentialsInform();
                    this.Reader.Begin(false);

                    packet.Result = this.Reader.ReadBoolean();

                    //Now Call event
                    if (RevokeCredentialsInform != null)
                    RevokeCredentialsInform(this, packet);

                    break;
                }

                case 0x2DD19B9Bu:
                {
                    var packet = new HubSubscribeInform();
                    this.Reader.Begin(false);

                    packet.Status = this.Reader.ReadInt16();

                    //Now Call event
                    if (HubSubscribeInform != null)
                    HubSubscribeInform(this, packet);

                    break;
                }

                case 0x6C63B75u:
                {
                    var packet = new HubUnsubscribeInform();
                    this.Reader.Begin(false);

                    packet.Status = this.Reader.ReadInt16();

                    //Now Call event
                    if (HubUnsubscribeInform != null)
                    HubUnsubscribeInform(this, packet);

                    break;
                }

                case 0x96B41079u:
                {
                    var packet = new HubPublishInform();
                    this.Reader.Begin(false);

                    packet.Status = this.Reader.ReadInt16();

                    //Now Call event
                    if (HubPublishInform != null)
                    HubPublishInform(this, packet);

                    break;
                }

                case 0x65B2818Cu:
                {
                    var packet = new HubEventInform();
                    this.Reader.Begin(true);

                    packet.HubName = this.Reader.ReadString();
                    packet.Message = this.Reader.ReadString();
                    packet.Time = this.Reader.ReadDateTime();

                    //Now Call event
                    if (HubEventInform != null)
                    HubEventInform(this, packet);

                    break;
                }

                default:
                Debug.WriteLine("Unknow packet : {0:X}", key);
                return;
            }
        }


    }



}