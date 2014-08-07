
using System;
using System.Diagnostics;
using System.Text;
using System.Threading.Tasks;
using Windows.Networking;
using Windows.Networking.Sockets;
using Windows.Storage.Streams;

namespace Spike.Network
{
 
		/*
	* Copyright (c) 2005 Oren J. Maurice <oymaurice@hazorea.org.il>
	* 
	* Redistribution and use in source and binary forms, with or without modifica-
	* tion, are permitted provided that the following conditions are met:
	* 
	*   1.  Redistributions of source code must retain the above copyright notice,
	*       this list of conditions and the following disclaimer.
	* 
	*   2.  Redistributions in binary form must reproduce the above copyright
	*       notice, this list of conditions and the following disclaimer in the
	*       documentation and/or other materials provided with the distribution.
	* 
	*   3.  The name of the author may not be used to endorse or promote products
	*       derived from this software without specific prior written permission.
	* 
	* THIS SOFTWARE IS PROVIDED BY THE AUTHOR ``AS IS'' AND ANY EXPRESS OR IMPLIED
	* WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MER-
	* CHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.  IN NO
	* EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPE-
	* CIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
	* PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
	* OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
	* WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTH-
	* ERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED
	* OF THE POSSIBILITY OF SUCH DAMAGE.
	*
	* Alternatively, the contents of this file may be used under the terms of
	* the GNU General Public License version 2 (the "GPL"), in which case the
	* provisions of the GPL are applicable instead of the above. If you wish to
	* allow the use of your version of this file only under the terms of the
	* GPL and not to allow others to use your version of this file under the
	* BSD license, indicate your decision by deleting the provisions above and
	* replace them with the notice and other provisions required by the GPL. If
	* you do not delete the provisions above, a recipient may use your version
	* of this file under either the BSD or the GPL.
	*/
	
	/// <summary>
	/// Summary description for CLZF.
	/// </summary>
	public class CLZF
	{
		// CRC32 data & function
		UInt32 []crc_32_tab = new UInt32[256]
		{
			0x00000000, 0x77073096, 0xee0e612c, 0x990951ba, 0x076dc419,
			0x706af48f, 0xe963a535, 0x9e6495a3, 0x0edb8832, 0x79dcb8a4,
			0xe0d5e91e, 0x97d2d988, 0x09b64c2b, 0x7eb17cbd, 0xe7b82d07,
			0x90bf1d91, 0x1db71064, 0x6ab020f2, 0xf3b97148, 0x84be41de,
			0x1adad47d, 0x6ddde4eb, 0xf4d4b551, 0x83d385c7, 0x136c9856,
			0x646ba8c0, 0xfd62f97a, 0x8a65c9ec, 0x14015c4f, 0x63066cd9,
			0xfa0f3d63, 0x8d080df5, 0x3b6e20c8, 0x4c69105e, 0xd56041e4,
			0xa2677172, 0x3c03e4d1, 0x4b04d447, 0xd20d85fd, 0xa50ab56b,
			0x35b5a8fa, 0x42b2986c, 0xdbbbc9d6, 0xacbcf940, 0x32d86ce3,
			0x45df5c75, 0xdcd60dcf, 0xabd13d59, 0x26d930ac, 0x51de003a,
			0xc8d75180, 0xbfd06116, 0x21b4f4b5, 0x56b3c423, 0xcfba9599,
			0xb8bda50f, 0x2802b89e, 0x5f058808, 0xc60cd9b2, 0xb10be924,
			0x2f6f7c87, 0x58684c11, 0xc1611dab, 0xb6662d3d, 0x76dc4190,
			0x01db7106, 0x98d220bc, 0xefd5102a, 0x71b18589, 0x06b6b51f,
			0x9fbfe4a5, 0xe8b8d433, 0x7807c9a2, 0x0f00f934, 0x9609a88e,
			0xe10e9818, 0x7f6a0dbb, 0x086d3d2d, 0x91646c97, 0xe6635c01,
			0x6b6b51f4, 0x1c6c6162, 0x856530d8, 0xf262004e, 0x6c0695ed,
			0x1b01a57b, 0x8208f4c1, 0xf50fc457, 0x65b0d9c6, 0x12b7e950,
			0x8bbeb8ea, 0xfcb9887c, 0x62dd1ddf, 0x15da2d49, 0x8cd37cf3,
			0xfbd44c65, 0x4db26158, 0x3ab551ce, 0xa3bc0074, 0xd4bb30e2,
			0x4adfa541, 0x3dd895d7, 0xa4d1c46d, 0xd3d6f4fb, 0x4369e96a,
			0x346ed9fc, 0xad678846, 0xda60b8d0, 0x44042d73, 0x33031de5,
			0xaa0a4c5f, 0xdd0d7cc9, 0x5005713c, 0x270241aa, 0xbe0b1010,
			0xc90c2086, 0x5768b525, 0x206f85b3, 0xb966d409, 0xce61e49f,
			0x5edef90e, 0x29d9c998, 0xb0d09822, 0xc7d7a8b4, 0x59b33d17,
			0x2eb40d81, 0xb7bd5c3b, 0xc0ba6cad, 0xedb88320, 0x9abfb3b6,
			0x03b6e20c, 0x74b1d29a, 0xead54739, 0x9dd277af, 0x04db2615,
			0x73dc1683, 0xe3630b12, 0x94643b84, 0x0d6d6a3e, 0x7a6a5aa8,
			0xe40ecf0b, 0x9309ff9d, 0x0a00ae27, 0x7d079eb1, 0xf00f9344,
			0x8708a3d2, 0x1e01f268, 0x6906c2fe, 0xf762575d, 0x806567cb,
			0x196c3671, 0x6e6b06e7, 0xfed41b76, 0x89d32be0, 0x10da7a5a,
			0x67dd4acc, 0xf9b9df6f, 0x8ebeeff9, 0x17b7be43, 0x60b08ed5,
			0xd6d6a3e8, 0xa1d1937e, 0x38d8c2c4, 0x4fdff252, 0xd1bb67f1,
			0xa6bc5767, 0x3fb506dd, 0x48b2364b, 0xd80d2bda, 0xaf0a1b4c,
			0x36034af6, 0x41047a60, 0xdf60efc3, 0xa867df55, 0x316e8eef,
			0x4669be79, 0xcb61b38c, 0xbc66831a, 0x256fd2a0, 0x5268e236,
			0xcc0c7795, 0xbb0b4703, 0x220216b9, 0x5505262f, 0xc5ba3bbe,
			0xb2bd0b28, 0x2bb45a92, 0x5cb36a04, 0xc2d7ffa7, 0xb5d0cf31,
			0x2cd99e8b, 0x5bdeae1d, 0x9b64c2b0, 0xec63f226, 0x756aa39c,
			0x026d930a, 0x9c0906a9, 0xeb0e363f, 0x72076785, 0x05005713,
			0x95bf4a82, 0xe2b87a14, 0x7bb12bae, 0x0cb61b38, 0x92d28e9b,
			0xe5d5be0d, 0x7cdcefb7, 0x0bdbdf21, 0x86d3d2d4, 0xf1d4e242,
			0x68ddb3f8, 0x1fda836e, 0x81be16cd, 0xf6b9265b, 0x6fb077e1,
			0x18b74777, 0x88085ae6, 0xff0f6a70, 0x66063bca, 0x11010b5c,
			0x8f659eff, 0xf862ae69, 0x616bffd3, 0x166ccf45, 0xa00ae278,
			0xd70dd2ee, 0x4e048354, 0x3903b3c2, 0xa7672661, 0xd06016f7,
			0x4969474d, 0x3e6e77db, 0xaed16a4a, 0xd9d65adc, 0x40df0b66,
			0x37d83bf0, 0xa9bcae53, 0xdebb9ec5, 0x47b2cf7f, 0x30b5ffe9,
			0xbdbdf21c, 0xcabac28a, 0x53b39330, 0x24b4a3a6, 0xbad03605,
			0xcdd70693, 0x54de5729, 0x23d967bf, 0xb3667a2e, 0xc4614ab8,
			0x5d681b02, 0x2a6f2b94, 0xb40bbe37, 0xc30c8ea1, 0x5a05df1b,
			0x2d02ef8d
		};

		public UInt32 crc32(UInt32 OldCRC,byte NewData) 
		{
			return crc_32_tab[(OldCRC & 0xff) ^ NewData] ^ (OldCRC >> 8);
		}


		/// <summary>
		/// LZF Compressor
		/// </summary>

		UInt32 HLOG=14;
		UInt32 HSIZE=(1<<14);

		/*
		* don't play with this unless you benchmark!
		* decompression is not dependent on the hash function
		* the hashing function might seem strange, just believe me
		* it works ;)
		*/
		UInt32 MAX_LIT=(1 <<  5);
		UInt32 MAX_OFF=(1 << 13);
		UInt32 MAX_REF=((1 <<  8) + (1 << 3));

		UInt32 FRST(byte[] Array,UInt32 ptr) 
		{
			return (UInt32)(((Array[ptr]) << 8) | Array[ptr+1]);
		}

		UInt32 NEXT(UInt32 v,byte[] Array,UInt32 ptr)
		{
			return ((v) << 8) | Array[ptr+2];
		}

		UInt32 IDX(UInt32 h) 
		{
			return ((h ^ (h << 5)) >> (int)(((3*8 - HLOG)) - h*5) & (HSIZE - 1));
		}

		/*
		* compressed format
		*
		* 000LLLLL <L+1>    ; literal
		* LLLOOOOO oooooooo ; backref L
		* 111OOOOO LLLLLLLL oooooooo ; backref L+7
		*
		*/

		public int lzf_compress (byte[] in_data, int in_len,byte[] out_data, int out_len)
		{
			int c;
			long []htab=new long[1<<14];
			for (c=0;c<1<<14;c++)
			{
				htab[c]=0;
			}

			long hslot;
			UInt32 iidx = 0;
			UInt32 oidx = 0;
			//byte *in_end  = ip + in_len;
			//byte *out_end = op + out_len;
			long reference;

			UInt32 hval = FRST (in_data,iidx);
			long off;
			int lit = 0;

			for (;;)
				{
				if (iidx < in_len - 2)
					{
					hval = NEXT (hval, in_data,iidx);
					hslot = IDX (hval);
					reference = htab[hslot]; 
					htab[hslot] = (long)iidx;

					if ((off = iidx - reference - 1) < MAX_OFF 
						&& iidx + 4 < in_len 
						&& reference > 0
						&& in_data[reference+0] == in_data[iidx+0]
						&& in_data[reference+1] == in_data[iidx+1]
						&& in_data[reference+2] == in_data[iidx+2]
						)
						{
						/* match found at *reference++ */
						UInt32 len = 2;
						UInt32 maxlen = (UInt32)in_len - iidx - len;
						maxlen = maxlen > MAX_REF ? MAX_REF : maxlen;

						if (oidx + lit + 1 + 3 >= out_len)
							return 0;

						do
							len++;
						while (len < maxlen && in_data[reference+len] == in_data[iidx+len]);

						if (lit!=0)
							{
							out_data[oidx++] = (byte)(lit - 1);
							lit = -lit;
							do
								out_data[oidx++] = in_data[iidx+lit];
							while ((++lit)!=0);
							}

						len -= 2;
						iidx++;

						if (len < 7)
							{
							out_data[oidx++] = (byte)((off >> 8) + (len << 5));
							}
						else
							{
							out_data[oidx++] = (byte)((off >> 8) + (  7 << 5));
							out_data[oidx++] = (byte)(len - 7);
							}

						out_data[oidx++] = (byte)off;

						iidx += len-1;
						hval = FRST (in_data,iidx);

						hval = NEXT (hval,in_data, iidx);
						htab[IDX (hval)] = iidx;
						iidx++;

						hval = NEXT (hval, in_data,iidx);
						htab[IDX (hval)] = iidx;
						iidx++;
						continue;
						}
					}
				else if (iidx == in_len)
					break;

				/* one more literal byte we must copy */
				lit++;
				iidx++;

				if (lit == MAX_LIT)
					{
					if (oidx + 1 + MAX_LIT >= out_len)
						return 0;

					out_data[oidx++] = (byte)(MAX_LIT - 1);
					lit = -lit;
					do
						out_data[oidx++] = in_data[iidx+lit];
					while ((++lit)!=0);
					}
				}

			if (lit!=0)
				{
				if (oidx + lit + 1 >= out_len)
					return 0;

				out_data[oidx++] = (byte)(lit - 1);
				lit = -lit;
				do
					out_data[oidx++] = in_data[iidx+lit];
				while ((++lit)!=0);
				}

			return (int)oidx;
		}

		/// <summary>
		/// LZF Decompressor
		/// </summary>
		public int lzf_decompress ( byte[] in_data, int in_len, byte[] out_data, int out_len)
		{
			UInt32 iidx=0;
			UInt32 oidx=0;

			do
				{
				UInt32 ctrl = in_data[iidx++];

				if (ctrl < (1 << 5)) /* literal run */
					{
					ctrl++;

					if (oidx + ctrl > out_len)
						{
						//SET_ERRNO (E2BIG);
						return 0;
						}

					do
						out_data[oidx++] = in_data[iidx++];
					while ((--ctrl)!=0);
					}
				else /* back reference */
					{
					UInt32 len = ctrl >> 5;

					int reference = (int)(oidx - ((ctrl & 0x1f) << 8) - 1);

					if (len == 7)
						len += in_data[iidx++];
			          
					reference -= in_data[iidx++];

					if (oidx + len + 2 > out_len)
						{
						//SET_ERRNO (E2BIG);
						return 0;
						}

					if (reference < 0)
						{
						//SET_ERRNO (EINVAL);
						return 0;
						}

					out_data[oidx++]=out_data[reference++];
					out_data[oidx++]=out_data[reference++];

					do
						out_data[oidx++]=out_data[reference++];
					while ((--len)!=0);
					}
				}
			while (iidx < in_len);

			return (int)oidx;
		}

		public CLZF()
		{
			//
			// TODO: Add ructor logic here
			//
		}
	}




 
		
	public enum ConnectionError
    {
        Unknown,
		User,
        Connection,
        Receive,
        Send
    }

    public abstract class TcpChannelBase<T> where T : TcpChannelBase<T>
    {
        public event Action<T> Connected;
        public event Action<T,ConnectionError> Disconnected;
        
        private StreamSocket socket;
        private DataWriter SocketWriter;
        private DataReader SocketReader;

        private object mutext = new object();
        private bool disposed = false;

        private byte[] SendBuffer;
        private int SendBufferPosition;

        private byte[] ReceiveBuffer;
        private int ReceiveBufferPosition;
        private int ReceiveBufferSize;

		public int BufferSize { get; protected set; } 

		public TcpChannelBase(int bufferSize)
		{
			BufferSize = bufferSize;
		}

        public async Task Connect(string host, int port)
        {
            try
            {
				socket = new StreamSocket();
                await socket.ConnectAsync(new HostName(host), port.ToString());

				SocketWriter = new DataWriter(socket.OutputStream);
				SocketReader = new DataReader(socket.InputStream);
				SocketReader.InputStreamOptions = InputStreamOptions.Partial;

				SendBuffer = new byte[BufferSize];
				SendBufferPosition = 0;

				ReceiveBuffer = new byte[BufferSize];
				ReceiveBufferPosition = 0;
				ReceiveBufferSize = 0;

				if (Connected != null)
					Connected((T)this);
			}
			catch (Exception)
            {
                Disconnect(ConnectionError.Connection);
				return;
            }

			try
            {	
                while (true)
                {
					//Read Size
					ReceiveBufferSize = (int) await SocketReader.LoadAsync(sizeof(int));
					if(ReceiveBufferSize != sizeof(int))
					{
                        Disconnect(ConnectionError.Receive);
                        return;
                    }

                    for (int index = 0; index < ReceiveBufferSize; index++)
                        ReceiveBuffer[index] = SocketReader.ReadByte();
					
					//read packet data
					ReceiveBufferPosition = 0;
                    var size = PacketReadUInt32();
					ReceiveBufferSize = (int) await SocketReader.LoadAsync(size);
					if (ReceiveBufferSize != size )
                    {
                        //Console.WriteLine("size : {0}/{1}", ReceiveBufferSize, size+4 );
                        Disconnect(ConnectionError.Receive);
                        return;
                    }
					ReceiveBufferSize += sizeof(int);
					for (int index = sizeof(int); index < ReceiveBufferSize; index++)
                        ReceiveBuffer[index] = SocketReader.ReadByte();

                    OnReceive(PacketReadUInt32());
                }
            }
            catch (Exception)
            {
                Disconnect(ConnectionError.Receive);
            }
        }

		public void Disconnect()
        {
			Disconnect(ConnectionError.User);
		}

        private void Disconnect(ConnectionError error)
        {
            if (socket != null)
            {
                var mustRaise = false;
                lock (socket)
                {
                    if (!disposed)
                    {
                        mustRaise = true;
                        disposed = true;
                        socket.Dispose();
                    }
                }

                if (mustRaise && Disconnected != null)
                    Disconnected((T)this, error);
            }
        }

        protected void BeginReadPacket(bool compressed)
        {
            if (compressed)
            {
                var compressedBuffer = new byte[ReceiveBufferSize - 8];
                var uncompressedBuffer = new byte[BufferSize];
                System.Buffer.BlockCopy(ReceiveBuffer, 8, compressedBuffer, 0, compressedBuffer.Length);
                var cipher = new CLZF();
                var uncompressedSize = cipher.lzf_decompress(compressedBuffer, compressedBuffer.Length, uncompressedBuffer, uncompressedBuffer.Length);
                System.Buffer.BlockCopy(uncompressedBuffer, 0, ReceiveBuffer, 8, uncompressedSize);
                ReceiveBufferSize = uncompressedSize + 8;
            }
        }

        protected void BeginNewPacket(uint key)
        {
            SendBufferPosition = 4;
            PacketWrite(key);
        }

        private void SetSize()
        {
            var size = SendBufferPosition - 4;
            SendBuffer[0] = ((byte)(size >> 24));
            SendBuffer[1] = ((byte)(size >> 16));
            SendBuffer[2] = ((byte)(size >> 8));
            SendBuffer[3] = ((byte)size);
        }

        protected async Task SendPacket(bool compressed)
        {
            try
            {
                if (compressed && SendBufferPosition > 8)
                {
                    //TODO make this better
                    var cipher = new CLZF();
                    var uncompressedBytes = new byte[SendBufferPosition - 8];
                    System.Buffer.BlockCopy(SendBuffer, 8, uncompressedBytes, 0, uncompressedBytes.Length);
                    var compressedBytes = new byte[BufferSize];
                    var size = cipher.lzf_compress(uncompressedBytes, uncompressedBytes.Length, compressedBytes, compressedBytes.Length);
                    System.Buffer.BlockCopy(compressedBytes, 0, SendBuffer, 8, size);
                    SendBufferPosition = size + 8;
                }

                SetSize();

                for (int index = 0; index < SendBufferPosition; index++)
					SocketWriter.WriteByte(SendBuffer[index]);

				await SocketWriter.StoreAsync();
				
            }
            catch (Exception)
            {
                Disconnect(ConnectionError.Send);
            }
        }

        #region Spike Primary Type
        // Byte
        protected void PacketWrite(byte value)
        {
            SendBuffer[SendBufferPosition++] = value;
        }
        protected byte PacketReadByte()
        {
            return ReceiveBuffer[ReceiveBufferPosition++];
        }
        protected byte[] PacketReadListOfByte()
        {
            var value = new byte[PacketReadInt32()];
            System.Buffer.BlockCopy(ReceiveBuffer, ReceiveBufferPosition, value, 0, value.Length);
            ReceiveBufferPosition += value.Length;
            return value;
        }
        protected void PacketWrite(byte[] value)
        {
            PacketWrite(value.Length);
            System.Buffer.BlockCopy(value, 0, SendBuffer, SendBufferPosition, value.Length);
            SendBufferPosition += value.Length;
        }

        // SByte
        //Don't existe in spike protocol

        // UInt16
        protected ushort PacketReadUInt16()
        {
            return (ushort)((ReceiveBuffer[ReceiveBufferPosition++] << 8)
                | ReceiveBuffer[ReceiveBufferPosition++]);
        }
        protected void PacketWrite(ushort value)
        {
            PacketWrite((byte)(value >> 8));
            PacketWrite((byte)value);
        }
        protected ushort[] PacketReadListOfUInt16()
        {
            var value = new ushort[PacketReadInt32()];
            for (int index = 0; index < value.Length; index++)
                value[index] = PacketReadUInt16();
            return value;
        }
        protected void PacketWrite(ushort[] value)
        {
            PacketWrite(value.Length);
            foreach (var element in value)
                PacketWrite(element);
        }

        // Int16
        protected short PacketReadInt16()
        {
            return (short)((ReceiveBuffer[ReceiveBufferPosition++] << 8)
                | ReceiveBuffer[ReceiveBufferPosition++]);
        }
        protected void PacketWrite(short value)
        {
            PacketWrite((byte)(value >> 8));
            PacketWrite((byte)value);
        }
        protected short[] PacketReadListOfInt16()
        {
            var value = new short[PacketReadInt32()];
            for (int index = 0; index < value.Length; index++)
                value[index] = PacketReadInt16();
            return value;
        }
        protected void PacketWrite(short[] value)
        {
            PacketWrite(value.Length);
            foreach (var element in value)
                PacketWrite(element);
        }

        // UInt32
        protected uint PacketReadUInt32()
        {
            return (uint)(ReceiveBuffer[ReceiveBufferPosition++] << 24
                 | (ReceiveBuffer[ReceiveBufferPosition++] << 16)
                 | (ReceiveBuffer[ReceiveBufferPosition++] << 8)
                 | (ReceiveBuffer[ReceiveBufferPosition++]));
        }
        protected void PacketWrite(uint value)
        {
            PacketWrite((byte)(value >> 24));
            PacketWrite((byte)(value >> 16));
            PacketWrite((byte)(value >> 8));
            PacketWrite((byte)value);
        }
        protected uint[] PacketReadListOfUInt32()
        {
            var value = new uint[PacketReadInt32()];
            for (int index = 0; index < value.Length; index++)
                value[index] = PacketReadUInt32();
            return value;
        }
        protected void PacketWrite(uint[] value)
        {
            PacketWrite(value.Length);
            foreach (var element in value)
                PacketWrite(element);
        }

        // Int32
        protected int PacketReadInt32()
        {
            return ReceiveBuffer[ReceiveBufferPosition++] << 24
                 | (ReceiveBuffer[ReceiveBufferPosition++] << 16)
                 | (ReceiveBuffer[ReceiveBufferPosition++] << 8)
                 | (ReceiveBuffer[ReceiveBufferPosition++]);
        }

        protected void PacketWrite(int value)
        {
            PacketWrite((byte)(value >> 24));
            PacketWrite((byte)(value >> 16));
            PacketWrite((byte)(value >> 8));
            PacketWrite((byte)value);
        }
        protected int[] PacketReadListOfInt32()
        {
            var value = new int[PacketReadInt32()];
            for (int index = 0; index < value.Length; index++)
                value[index] = PacketReadInt32();
            return value;
        }
        protected void PacketWrite(int[] value)
        {
            PacketWrite(value.Length);
            foreach (var element in value)
                PacketWrite(element);
        }


        // UInt64
        protected ulong PacketReadUInt64()
        {
            ulong value = ReceiveBuffer[ReceiveBufferPosition++]; value <<= 8;
            value |= ReceiveBuffer[ReceiveBufferPosition++]; value <<= 8;
            value |= ReceiveBuffer[ReceiveBufferPosition++]; value <<= 8;
            value |= ReceiveBuffer[ReceiveBufferPosition++]; value <<= 8;
            value |= ReceiveBuffer[ReceiveBufferPosition++]; value <<= 8;
            value |= ReceiveBuffer[ReceiveBufferPosition++]; value <<= 8;
            value |= ReceiveBuffer[ReceiveBufferPosition++]; value <<= 8;
            value |= ReceiveBuffer[ReceiveBufferPosition++];
            return value;
        }
        protected void PacketWrite(ulong value)
        {
            PacketWrite((byte)(value >> 56));
            PacketWrite((byte)(value >> 48));
            PacketWrite((byte)(value >> 40));
            PacketWrite((byte)(value >> 32));
            PacketWrite((byte)(value >> 24));
            PacketWrite((byte)(value >> 16));
            PacketWrite((byte)(value >> 8));
            PacketWrite((byte)value);
        }
        protected ulong[] PacketReadListOfUInt64()
        {
            var value = new ulong[PacketReadInt32()];
            for (int index = 0; index < value.Length; index++)
                value[index] = PacketReadUInt64();
            return value;
        }
        protected void PacketWrite(ulong[] value)
        {
            PacketWrite(value.Length);
            foreach (var element in value)
                PacketWrite(element);
        }

        // Int64
        protected long PacketReadInt64()
        {
            long value = ReceiveBuffer[ReceiveBufferPosition++]; value <<= 8;
            value |= ReceiveBuffer[ReceiveBufferPosition++]; value <<= 8;
            value |= ReceiveBuffer[ReceiveBufferPosition++]; value <<= 8;
            value |= ReceiveBuffer[ReceiveBufferPosition++]; value <<= 8;
            value |= ReceiveBuffer[ReceiveBufferPosition++]; value <<= 8;
            value |= ReceiveBuffer[ReceiveBufferPosition++]; value <<= 8;
            value |= ReceiveBuffer[ReceiveBufferPosition++]; value <<= 8;
            value |= ReceiveBuffer[ReceiveBufferPosition++];
            return value;
        }
        protected void PacketWrite(long value)
        {
            PacketWrite((byte)(value >> 56));
            PacketWrite((byte)(value >> 48));
            PacketWrite((byte)(value >> 40));
            PacketWrite((byte)(value >> 32));
            PacketWrite((byte)(value >> 24));
            PacketWrite((byte)(value >> 16));
            PacketWrite((byte)(value >> 8));
            PacketWrite((byte)value);
        }
        protected long[] PacketReadListOfInt64()
        {
            var value = new long[PacketReadInt32()];
            for (int index = 0; index < value.Length; index++)
                value[index] = PacketReadInt64();
            return value;
        }
        protected void PacketWrite(long[] value)
        {
            PacketWrite(value.Length);
            foreach (var element in value)
                PacketWrite(element);
        }
        // Boolean
        protected bool PacketReadBoolean()
        {
            return ReceiveBuffer[ReceiveBufferPosition++] != 0;
        }
        protected void PacketWrite(bool value)
        {
            PacketWrite((byte)(value ? 1 : 0));
        }
        public bool[] PacketReadListOfBoolean()
        {
            var value = new bool[PacketReadInt32()];
            for (int index = 0; index < value.Length; index++)
                value[index] = PacketReadBoolean();
            return value;
        }
        protected void PacketWrite(bool[] value)
        {
            PacketWrite(value.Length);
            foreach (var element in value)
                PacketWrite(element);
        }

        // Single
        protected float PacketReadSingle()
        {
            var value = BitConverter.ToSingle(ReceiveBuffer, ReceiveBufferPosition);
            ReceiveBufferPosition += sizeof(float);
            return value;
        }
        protected void PacketWrite(float value)
        {
            foreach(var currentByte in BitConverter.GetBytes(value))
                PacketWrite(currentByte);
        }
        protected float[] PacketReadListOfSingle()
        {
            var value = new float[PacketReadInt32()];
            for (int index = 0; index < value.Length; index++)
                value[index] = PacketReadSingle();
            return value;
        }
        protected void PacketWrite(float[] value)
        {
            PacketWrite(value.Length);
            foreach (var element in value)
                PacketWrite(element);
        }

        // Double
        protected double PacketReadDouble()
        {
            var value = BitConverter.ToDouble(ReceiveBuffer, ReceiveBufferPosition);
            ReceiveBufferPosition += sizeof(double);
            return value;
        }
        protected void PacketWrite(double value)
        {
            foreach(var currentByte in BitConverter.GetBytes(value))
                PacketWrite(currentByte);
        }
        protected double[] PacketReadListOfDouble()
        {
            var value = new double[PacketReadInt32()];
            for (int index = 0; index < value.Length; index++)
                value[index] = PacketReadDouble();
            return value;
        }
        protected void PacketWrite(double[] value)
        {
            PacketWrite(value.Length);
            foreach (var element in value)
                PacketWrite(element);
        }

        // String
        protected string PacketReadString()
        {
            var bytes = PacketReadListOfByte();
            return Encoding.UTF8.GetString(bytes, 0, bytes.Length);
        }
        protected void PacketWrite(string value)
        {
            PacketWrite(Encoding.UTF8.GetBytes(value));
        }
        protected string[] PacketReadListOfString()
        {
            var value = new string[PacketReadInt32()];
            for (int index = 0; index < value.Length; index++)
                value[index] = PacketReadString();
            return value;
        }
        protected void PacketWrite(string[] value)
        {
            PacketWrite(value.Length);
            foreach (var element in value)
                PacketWrite(element);
        }

        // DateTime
        protected DateTime PacketReadDateTime()
        {
            var year = PacketReadInt16();
            var month = PacketReadInt16();
            var day = PacketReadInt16();
            var hour = PacketReadInt16();
            var minute = PacketReadInt16();
            var second = PacketReadInt16();
            var millisecond = PacketReadInt16();

            return new DateTime(year, month, day, hour, minute, second, millisecond);
        }
        protected void PacketWrite(DateTime value)
        {
            PacketWrite((short)value.Year);
            PacketWrite((short)value.Month);
            PacketWrite((short)value.Day);
            PacketWrite((short)value.Hour);
            PacketWrite((short)value.Minute);
            PacketWrite((short)value.Second);
            PacketWrite((short)value.Millisecond);
        }

        protected DateTime[] PacketReadListOfDateTime()
        {
            var value = new DateTime[PacketReadInt32()];
            for (int index = 0; index < value.Length; index++)
                value[index] = PacketReadDateTime();
            return value;
        }
        protected void PacketWrite(DateTime[] value)
        {
            PacketWrite(value.Length);
            foreach (var element in value)
                PacketWrite(element);
        }
        #endregion

        protected abstract void OnReceive(uint key);

        #region Dynamics
        [Obsolete("DynamicType is obsolete. Consider using JSON or XML serialized objects instead.", false)]
        protected void PacketWrite(object value)
        {
            if (value is byte)
            {
                PacketWrite(true);
                PacketWrite(@"Byte");
                PacketWrite((byte)value);
            }
            else if (value is ushort)
            {
                PacketWrite(true);
                PacketWrite(@"UInt16");
                PacketWrite((ushort)value);
            }
            else if (value is short)
            {
                PacketWrite(true);
                PacketWrite(@"Int16");
                PacketWrite((short)value);
            }
            else if (value is uint)
            {
                PacketWrite(true);
                PacketWrite(@"UInt32");
                PacketWrite((uint)value);
            }
            else if (value is int)
            {
                PacketWrite(true);
                PacketWrite(@"Int32");
                PacketWrite((int)value);
            }
            else if (value is ulong)
            {
                PacketWrite(true);
                PacketWrite(@"UInt64");
                PacketWrite((ulong)value);
            }
            else if (value is long)
            {
                PacketWrite(true);
                PacketWrite(@"Int64");
                PacketWrite((long)value);
            }
            else if (value is float)
            {
                PacketWrite(true);
                PacketWrite(@"Single");
                PacketWrite((float)value);
            }
            else if (value is double)
            {
                PacketWrite(true);
                PacketWrite(@"Double");
                PacketWrite((double)value);
            }
            else if (value is bool)
            {
                PacketWrite(true);
                PacketWrite(@"Boolean");
                PacketWrite((bool)value);
            }
            else if (value is string)
            {
                PacketWrite(true);
                PacketWrite(@"String");
                PacketWrite((string)value);
            }
            else if (value is DateTime)
            {
                PacketWrite(true);
                PacketWrite(@"DateTime");
                PacketWrite((DateTime)value);
            }
            else
                PacketWrite(false);
        }
        [Obsolete("DynamicType is obsolete. Consider using JSON or XML serialized objects instead.", false)]
        protected object PacketReadDynamicType()
        {
            if (PacketReadBoolean())
            {
                switch (PacketReadString())
                {
                    case "Byte":
                        return PacketReadByte();
                    case "UInt16":
                        return PacketReadUInt16();
                    case "Int16":
                        return PacketReadInt16();
                    case "UInt32":
                        return PacketReadUInt32();
                    case "Int32":
                        return PacketReadInt32();
                    case "UInt64":
                        return PacketReadUInt64();
                    case "Int64":
                        return PacketReadInt64();
                    case "Single":
                        return PacketReadSingle();
                    case "Double":
                        return PacketReadDouble();
                    case "Boolean":
                        return PacketReadBoolean();
                    case "String":
                        return PacketReadString();
                    case "DateTime":
                        return PacketReadDateTime();
                }
            }
            return null;
        }
        [Obsolete("DynamicType is obsolete. Consider using JSON or XML serialized objects instead.", false)]
        protected object[] PacketReadListOfDynamicType()
        {
            var value = new object[PacketReadInt32()];
            for (int index = 0; index < value.Length; index++)
                value[index] = PacketReadDynamicType();
            return value;
        }
        [Obsolete("DynamicType is obsolete. Consider using JSON or XML serialized objects instead.", false)]
        protected void PacketWrite(object[] value)
        {
            PacketWrite(value.Length);
            foreach (var element in value)
                PacketWrite((object)element);
        }
        #endregion


    }



 
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



 
			    public sealed class GetAllInform
    {
	
		public Parameter[] Table { get; set; }

    }


 
			    public sealed class CheckInform
    {
	
		public bool Success { get; set; }

    }


 
			    public sealed class GetInform
    {
	
		public object Value { get; set; }

    }


 
			    public sealed class EventInform
    {
	
		public string Message { get; set; }
	
		public DateTime Time { get; set; }

    }




 
			    public partial struct Parameter
    {
	
		public string Key { get; set; }
	
		public object Value { get; set; }
    }


}

