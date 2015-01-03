using Spike;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Stress.Server
{
    /// <summary>
    /// Represents a simple cache with notifications.
    /// </summary>
    public sealed class StressStore
    {
        private readonly ConcurrentDictionary<string, object> Store =
            new ConcurrentDictionary<string, object>();

        /// <summary>
        /// Initialize randomly some keys.
        /// </summary>
        public StressStore()
        {
            foreach (var type in StressGen.Types)
            {
                for (int i = 0; i < 100; ++i)
                {
                    var key = type + ":" + i;
                    var value = StressGen.NextValue(type);
                    if (value != null)
                        Store.TryAdd(key, value);
                    else
                        Console.WriteLine("Null value");
                }
            }
        }

        /// <summary>
        /// Event raised on a change.
        /// </summary>
        public event Action<string> Notify;

        /// <summary>
        /// Gets the key from the in-memory store.
        /// </summary>
        /// <param name="key">The key to get.</param>
        /// <returns>The object.</returns>
        public object Get(string key)
        {
            object value;
            if (Store.TryGetValue(key, out value))
                return value;
            return null;
        }

        /// <summary>
        /// Checks the key to the in-memory store.
        /// </summary>
        /// <param name="key">The key to check.</param>
        /// <param name="value">The value to check.</param>
        public bool TryCheck(string key, object value, out object correct)
        {
            correct = null;
            if (!Store.TryGetValue(key, out correct))
                return false;

            try
            {
                if (correct is System.Byte)
                    return Convert.ToByte(value) == Convert.ToByte(correct);
                if (correct is System.Int16)
                    return Convert.ToInt16(value) == Convert.ToInt16(correct);
                if (correct is System.UInt16)
                    return Convert.ToUInt16(value) == Convert.ToUInt16(correct);
                if (correct is System.Int32)
                    return Convert.ToInt32(value) == Convert.ToInt32(correct);
                if (correct is System.UInt32)
                    return Convert.ToUInt32(value) == Convert.ToUInt32(correct);
                if (correct is System.Int64)
                    return Convert.ToInt64(value) == Convert.ToInt64(correct);
                if (correct is System.UInt64)
                    return Convert.ToUInt64(value) == Convert.ToUInt64(correct);
                if (correct is System.Single)
                    return Math.Abs(Convert.ToSingle(value) - Convert.ToSingle(correct)) < 0.001;
                if (correct is System.Double)
                    return Math.Abs(Convert.ToDouble(value) - Convert.ToDouble(correct)) < 0.001;

                return correct.Equals(value);
            }
            catch(Exception ex)
            {
                Service.Logger.Log(ex);
                return false;
            }
        }

        /// <summary>
        /// Gets all the key-values.
        /// </summary>
        /// <returns></returns>
        public IDictionary<string, object> GetAll()
        {
            return this.Store;
        }
    }
}
