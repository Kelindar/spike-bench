package spike

import "time"

// Represents a serializable packet of type GetServerTimeInform.
type GetServerTimeInform struct {

	// Gets or sets the member 'ServerTime' of the packet.
	ServerTime time.Time
}