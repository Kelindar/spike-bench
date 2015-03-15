package spike

// Represents a serializable packet of type CheckInform.
type CheckInform struct {

	// Gets or sets the member 'Key' of the packet.
	Key string

	// Gets or sets the member 'Value' of the packet.
	Value interface{}

	// Gets or sets the member 'Success' of the packet.
	Success bool
}