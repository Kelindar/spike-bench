

using System;
using System.Diagnostics;
using System.Text;
using System.Threading.Tasks;
using System.Net.Sockets;

namespace Spike.Network
{


 
		public class TcpChannel : TcpChannelBase<TcpChannel>
	{
		public TcpChannel(int bufferSize = 8096) : base(bufferSize)
		{
		}

		//Events
		
		public event Action<TcpChannel, GetAllInform> GetAllInform; 
		
		public event Action<TcpChannel, CheckInform> CheckInform; 
		
		public event Action<TcpChannel, GetInform> GetInform; 
		
		public event Action<TcpChannel, EventInform> EventInform; 
		    
		//Sends        
		
		public async Task GetAll()
		{
			BeginNewPacket(0xB22E7270u);
			await SendPacket(false);
		}		 
		
		public async Task Check(string Key, object Value)
		{
			BeginNewPacket(0x1562224u);
			PacketWrite(Key);
			PacketWrite(Value);
			await SendPacket(false);
		}		 
		
		public async Task Get(string Key)
		{
			BeginNewPacket(0x3E05ECEEu);
			PacketWrite(Key);
			await SendPacket(false);
		}		 

		//Dispatcher
		protected override void OnReceive(uint key)
		{
			switch (key)
			{
				
				case 0xB22E7270u:
				{
					var packet = new GetAllInform();
					BeginReadPacket(false);
					
					packet.Table = PacketReadListOfParameter();

					//Now Call event
					if (GetAllInform != null)
						GetAllInform(this, packet);

					break;
				}
				
				case 0x1562224u:
				{
					var packet = new CheckInform();
					BeginReadPacket(false);
					
					packet.Success = PacketReadBoolean();

					//Now Call event
					if (CheckInform != null)
						CheckInform(this, packet);

					break;
				}
				
				case 0x3E05ECEEu:
				{
					var packet = new GetInform();
					BeginReadPacket(false);
					
					packet.Value = PacketReadDynamicType();

					//Now Call event
					if (GetInform != null)
						GetInform(this, packet);

					break;
				}
				
				case 0xBA220D80u:
				{
					var packet = new EventInform();
					BeginReadPacket(false);
					
					packet.Message = PacketReadString();
					packet.Time = PacketReadDateTime();

					//Now Call event
					if (EventInform != null)
						EventInform(this, packet);

					break;
				}

				default:
					Debug.WriteLine("Unknow packet : {0:X}", key);
					return;
			}
		}

		//Custom Type
		protected Parameter PacketReadParameter()
        {
            var value = new Parameter();
			value.Key = PacketReadString();
			value.Value = PacketReadDynamicType();
			return value;
        }
        protected void PacketWrite(Parameter value)
        {
            			PacketWrite(value.Key);
			PacketWrite(value.Value);
        }

        protected Parameter[] PacketReadListOfParameter()
        {
            var value = new Parameter[PacketReadInt32()];
            for (int index = 0; index < value.Length; index++)
                value[index] = PacketReadParameter();
            return value;
        }
        protected void PacketWrite(Parameter[] value)
        {
            PacketWrite(value.Length);
            foreach (var element in value)
                PacketWrite(element);
        }

	}






}

