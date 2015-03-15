package spike

import "time"

// Represents a serializable packet of type HubEventInform.
type HubEventInform struct {

	// Gets or sets the member 'HubName' of the packet.
	HubName string

	// Gets or sets the member 'Message' of the packet.
	Message string

	// Gets or sets the member 'Time' of the packet.
	Time time.Time
}