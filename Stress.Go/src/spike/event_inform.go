package spike

import "time"

// Represents a serializable packet of type EventInform.
type EventInform struct {

	// Gets or sets the member 'Message' of the packet.
	Message string

	// Gets or sets the member 'Time' of the packet.
	Time time.Time
}