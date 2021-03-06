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
    /// Represents a packet writer that can be used to serialize packets.
    /// </summary>
    public sealed class PacketWriter
    {
        private readonly int Capacity;
        private byte[] Buffer;
        private int Offset;

        /// <summary>
        /// Constructs a new packet writer.
        /// </summary>
        /// <param name="capacity">The size of the buffer to allocate.</param>
        /// <param name="key">The</param>
        public PacketWriter(int capacity)
        {
            this.Capacity = capacity;
            this.Buffer = new byte[capacity];
            this.Offset = 0;
        }


        /// <summary>
        /// Gets the underlying buffer 
        /// </summary>
        /// <param name="compressed">Whether we should compress or not.</param>
        /// <returns>The segment of the array </returns>
        public byte[] Flush(bool compressed)
        {
            if (compressed && this.Offset > 8)
            {
                // TODO: This should be seriously improved
                var packer = new CLZF();
                var uncompressedBytes = new byte[this.Offset - 8];
                System.Buffer.BlockCopy(this.Buffer, 8, uncompressedBytes, 0, uncompressedBytes.Length);
                var compressedBytes = new byte[this.Capacity];
                var size = packer.lzf_compress(uncompressedBytes, uncompressedBytes.Length, compressedBytes, compressedBytes.Length);
                System.Buffer.BlockCopy(compressedBytes, 0, this.Buffer, 8, size);

                // Update the new offset
                this.Offset = size + 8;
            }

            // Write the current size
            var length = this.Offset - 4;
            this.Buffer[0] = ((byte)(length >> 24));
            this.Buffer[1] = ((byte)(length >> 16));
            this.Buffer[2] = ((byte)(length >> 8));
            this.Buffer[3] = ((byte)length);

            // Return a copy of the buffer, avoiding any shared state
            var encoded = new byte[this.Offset];
            System.Buffer.BlockCopy(this.Buffer, 0, encoded, 0, this.Offset);
            return encoded;
        }

        /// <summary>
        /// Writes a packet key to the underlying buffer.
        /// </summary>
        /// <param name="key">The packet key to write.</param>
        public void Begin(uint key)
        {
            this.Offset = 4;
            this.Write(key);
        }

        /// <summary>
        /// Writes a value to the underlying buffer.
        /// </summary>
        /// <param name="value">The value to write.</param>
        public void Write(byte value)
        {
            this.Buffer[this.Offset++] = value;
        }

        /// <summary>
        /// Writes a value to the underlying buffer.
        /// </summary>
        /// <param name="value">The value to write.</param>
        public void Write(byte[] value)
        {
            Write(value.Length);
            System.Buffer.BlockCopy(value, 0, this.Buffer, this.Offset, value.Length);
            this.Offset += value.Length;
        }

        /// <summary>
        /// Writes a value to the underlying buffer.
        /// </summary>
        /// <param name="value">The value to write.</param>
        public void Write(ushort value)
        {
            Write((byte)(value >> 8));
            Write((byte)value);
        }

        /// <summary>
        /// Writes a value to the underlying buffer.
        /// </summary>
        /// <param name="value">The value to write.</param>
        public void Write(ushort[] value)
        {
            Write(value.Length);
            foreach (var element in value)
            Write(element);
        }

        /// <summary>
        /// Writes a value to the underlying buffer.
        /// </summary>
        /// <param name="value">The value to write.</param>
        public void Write(short value)
        {
            Write((byte)(value >> 8));
            Write((byte)value);
        }

        /// <summary>
        /// Writes a value to the underlying buffer.
        /// </summary>
        /// <param name="value">The value to write.</param>
        public void Write(short[] value)
        {
            Write(value.Length);
            foreach (var element in value)
            Write(element);
        }

        /// <summary>
        /// Writes a value to the underlying buffer.
        /// </summary>
        /// <param name="value">The value to write.</param>
        public void Write(uint value)
        {
            Write((byte)(value >> 24));
            Write((byte)(value >> 16));
            Write((byte)(value >> 8));
            Write((byte)value);
        }

        /// <summary>
        /// Writes a value to the underlying buffer.
        /// </summary>
        /// <param name="value">The value to write.</param>
        public void Write(uint[] value)
        {
            Write(value.Length);
            foreach (var element in value)
            Write(element);
        }

        /// <summary>
        /// Writes a value to the underlying buffer.
        /// </summary>
        /// <param name="value">The value to write.</param>
        public void Write(int value)
        {
            Write((byte)(value >> 24));
            Write((byte)(value >> 16));
            Write((byte)(value >> 8));
            Write((byte)value);
        }

        /// <summary>
        /// Writes a value to the underlying buffer.
        /// </summary>
        /// <param name="value">The value to write.</param>
        public void Write(int[] value)
        {
            Write(value.Length);
            foreach (var element in value)
            Write(element);
        }

        /// <summary>
        /// Writes a value to the underlying buffer.
        /// </summary>
        /// <param name="value">The value to write.</param>
        public void Write(ulong value)
        {
            Write((byte)(value >> 56));
            Write((byte)(value >> 48));
            Write((byte)(value >> 40));
            Write((byte)(value >> 32));
            Write((byte)(value >> 24));
            Write((byte)(value >> 16));
            Write((byte)(value >> 8));
            Write((byte)value);
        }

        /// <summary>
        /// Writes a value to the underlying buffer.
        /// </summary>
        /// <param name="value">The value to write.</param>
        public void Write(ulong[] value)
        {
            Write(value.Length);
            foreach (var element in value)
            Write(element);
        }

        /// <summary>
        /// Writes a value to the underlying buffer.
        /// </summary>
        /// <param name="value">The value to write.</param>
        public void Write(long value)
        {
            Write((byte)(value >> 56));
            Write((byte)(value >> 48));
            Write((byte)(value >> 40));
            Write((byte)(value >> 32));
            Write((byte)(value >> 24));
            Write((byte)(value >> 16));
            Write((byte)(value >> 8));
            Write((byte)value);
        }

        /// <summary>
        /// Writes a value to the underlying buffer.
        /// </summary>
        /// <param name="value">The value to write.</param>
        public void Write(long[] value)
        {
            Write(value.Length);
            foreach (var element in value)
            Write(element);
        }

        /// <summary>
        /// Writes a value to the underlying buffer.
        /// </summary>
        /// <param name="value">The value to write.</param>
        public void Write(bool value)
        {
            Write((byte)(value ? 1 : 0));
        }

        /// <summary>
        /// Writes a value to the underlying buffer.
        /// </summary>
        /// <param name="value">The value to write.</param>
        public void Write(bool[] value)
        {
            Write(value.Length);
            foreach (var element in value)
            Write(element);
        }


        /// <summary>
        /// Writes a value to the underlying buffer.
        /// </summary>
        /// <param name="value">The value to write.</param>
        public void Write(float value)
        {
            var bytes = System.BitConverter.GetBytes(value);
            if (BitConverter.IsLittleEndian)
            {
                for (var i = bytes.Length - 1; i >= 0; --i)
                Write(bytes[i]);
            }
            else
            {
                for (var i = 0; i < bytes.Length; ++i)
                Write(bytes[i]);
            }
        }

        /// <summary>
        /// Writes a value to the underlying buffer.
        /// </summary>
        /// <param name="value">The value to write.</param>
        public void Write(float[] value)
        {
            Write(value.Length);
            foreach (var element in value)
            Write(element);
        }

        /// <summary>
        /// Writes a value to the underlying buffer.
        /// </summary>
        /// <param name="value">The value to write.</param>
        public void Write(double value)
        {
            var bytes = BitConverter.GetBytes(value);
            if (BitConverter.IsLittleEndian)
            {
                for (var i = bytes.Length - 1; i >= 0; --i)
                Write(bytes[i]);
            }
            else
            {
                for (var i = 0; i < bytes.Length; ++i)
                Write(bytes[i]);
            }
        }

        /// <summary>
        /// Writes a value to the underlying buffer.
        /// </summary>
        /// <param name="value">The value to write.</param>
        public void Write(double[] value)
        {
            Write(value.Length);
            foreach (var element in value)
            Write(element);
        }

        /// <summary>
        /// Writes a value to the underlying buffer.
        /// </summary>
        /// <param name="value">The value to write.</param>
        public void Write(string value)
        {
            Write(System.Text.Encoding.UTF8.GetBytes(value));
        }

        /// <summary>
        /// Writes a value to the underlying buffer.
        /// </summary>
        /// <param name="value">The value to write.</param>
        public void Write(string[] value)
        {
            Write(value.Length);
            foreach (var element in value)
            Write(element);
        }

        /// <summary>
        /// Writes a value to the underlying buffer.
        /// </summary>
        /// <param name="value">The value to write.</param>
        public void Write(DateTime value)
        {
            Write((short)value.Year);
            Write((short)value.Month);
            Write((short)value.Day);
            Write((short)value.Hour);
            Write((short)value.Minute);
            Write((short)value.Second);
            Write((short)value.Millisecond);
        }

        /// <summary>
        /// Writes a value to the underlying buffer.
        /// </summary>
        /// <param name="value">The value to write.</param>
        public void Write(DateTime[] value)
        {
            Write(value.Length);
            foreach (var element in value)
            Write(element);
        }

        /// <summary>
        /// Writes a value to the underlying buffer.
        /// </summary>
        /// <param name="value">The value to write.</param>
        [Obsolete("DynamicType is obsolete. Consider using JSON or XML serialized objects instead.", false)]
        public void Write(object value)
        {
            if (value is byte)
            {
                Write(true);
                Write(@"Byte");
                Write((byte)value);
            }
            else if (value is ushort)
            {
                Write(true);
                Write(@"UInt16");
                Write((ushort)value);
            }
            else if (value is short)
            {
                Write(true);
                Write(@"Int16");
                Write((short)value);
            }
            else if (value is uint)
            {
                Write(true);
                Write(@"UInt32");
                Write((uint)value);
            }
            else if (value is int)
            {
                Write(true);
                Write(@"Int32");
                Write((int)value);
            }
            else if (value is ulong)
            {
                Write(true);
                Write(@"UInt64");
                Write((ulong)value);
            }
            else if (value is long)
            {
                Write(true);
                Write(@"Int64");
                Write((long)value);
            }
            else if (value is float)
            {
                Write(true);
                Write(@"Single");
                Write((float)value);
            }
            else if (value is double)
            {
                Write(true);
                Write(@"Double");
                Write((double)value);
            }
            else if (value is bool)
            {
                Write(true);
                Write(@"Boolean");
                Write((bool)value);
            }
            else if (value is string)
            {
                Write(true);
                Write(@"String");
                Write((string)value);
            }
            else if (value is DateTime)
            {
                Write(true);
                Write(@"DateTime");
                Write((DateTime)value);
            }
            else
            Write(false);
        }

        /// <summary>
        /// Writes a value to the underlying buffer.
        /// </summary>
        /// <param name="value">The value to write.</param>
        [Obsolete("DynamicType is obsolete. Consider using JSON or XML serialized objects instead.", false)]
        public void Write(object[] value)
        {
            Write(value.Length);
            foreach (var element in value)
            Write((object)element);
        }

        /// <summary>
        /// Writes a value to the underlying buffer.
        /// </summary>
        /// <param name="value">The value to write.</param>
        protected void Write(Parameter value)
        {
            Write(value.Key);
            Write(value.Value);
        }

        /// <summary>
        /// Writes a value to the underlying buffer.
        /// </summary>
        /// <param name="value">The value to write.</param>
        protected void Write(Parameter[] value)
        {
            Write(value.Length);
            foreach (var element in value)
            Write(element);
        }
    }


}