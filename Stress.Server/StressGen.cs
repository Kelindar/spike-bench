using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Stress.Server
{
    /// <summary>
    /// Represents a random value generator.
    /// </summary>
    public sealed class StressGen
    {
        internal static Random Random = new Random(0); // <---- Seed
        internal static Type[] Types = new Type[]
        {
            typeof(Byte),
            typeof(Int16),
            typeof(Int32),
            typeof(Int64),
            typeof(UInt16),
            typeof(UInt32),
            typeof(UInt64),
            typeof(Boolean),
            typeof(Single),
            typeof(Double),
            typeof(DateTime),
            typeof(String)
        };


        public static object NextValue(Type type)
        {
            if(!Types.Contains(type))
                return null;

            if (type == typeof(Boolean))
                return Random.Next(0,2) == 1;
            if (type == typeof(Byte))
                return NextBytes(1)[0];
            if(type == typeof(Int16))
                return BitConverter.ToInt16(NextBytes(2), 0);
            if (type == typeof(UInt16))
                return BitConverter.ToUInt16(NextBytes(2), 0);
            if (type == typeof(Int32))
                return BitConverter.ToInt32(NextBytes(4), 0);
            if (type == typeof(UInt32))
                return BitConverter.ToUInt32(NextBytes(4), 0);
            if (type == typeof(Int64))
                return BitConverter.ToInt64(NextBytes(8), 0);
            if (type == typeof(UInt64))
                return BitConverter.ToUInt64(NextBytes(8), 0);
            if (type == typeof(Single))
                return BitConverter.ToSingle(NextBytes(4), 0);
            if (type == typeof(Double))
                return BitConverter.ToDouble(NextBytes(8), 0);
            if (type == typeof(DateTime))
                return new DateTime(Random.Next(2000, 3000), Random.Next(1, 12), Random.Next(1, 12), Random.Next(1, 24), Random.Next(1, 60), Random.Next(1, 60));
            if (type == typeof(String))
                return NextString(Random.Next(0, 1024));

            return null;
        }

        /// <summary>
        /// Gets a random array of bytes.
        /// </summary>
        private static byte[] NextBytes(int length)
        {
            var buffer = new byte[length];
            Random.NextBytes(buffer);
            return buffer;
        }

        /// <summary>
        /// Gets a random string.
        /// </summary>
        private static string NextString(int size)
        {
            StringBuilder builder = new StringBuilder();
            char ch;
            for (int i = 0; i < size; i++)
            {
                ch = Convert.ToChar(Convert.ToInt32(Math.Floor(26 * Random.NextDouble() + 65)));
                builder.Append(ch);
            }

            return builder.ToString();
        }

    }
}
