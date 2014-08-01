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
        public bool Check(string key, object value)
        {
            object old;
            if (!Store.TryGetValue(key, out old))
            {
                // Notify no key
                if (Notify != null)
                    Notify(String.Format("[NO KEY] key: {0}", key));
                return false;
            }


            if (old.Equals(value))
                return true;
            
            if (Notify != null)
                Notify(String.Format("[ERROR] key: {0}, found: {1}", key, old));
            return false;
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
