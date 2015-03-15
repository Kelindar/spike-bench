package spike


 import (
	"net"
	"io"
	"crypto/tls"
	"sync"
	"time"
	"encoding/binary"
	"bytes"
	"errors"
) 

type ChannelState int
const (
	Closed ChannelState = iota
	Open
)

// Represents a TCP/IP Channel to a Spike Engine server.
type TcpChannel struct {
	state ChannelState
	conn net.Conn
	guard *sync.Mutex

		
	// Channel for GetAllInform messages
	OnGetAll chan *GetAllInform 
		
	// Channel for CheckInform messages
	OnCheck chan *CheckInform 
		
	// Channel for GetInform messages
	OnGet chan *GetInform 
		
	// Channel for EventInform messages
	OnEvent chan *EventInform 
		
	// Channel for PingInform messages
	OnPing chan *PingInform 
		
	// Channel for GetServerTimeInform messages
	OnGetServerTime chan *GetServerTimeInform 
		
	// Channel for SupplyCredentialsInform messages
	OnSupplyCredentials chan *SupplyCredentialsInform 
		
	// Channel for RevokeCredentialsInform messages
	OnRevokeCredentials chan *RevokeCredentialsInform 
		
	// Channel for HubSubscribeInform messages
	OnHubSubscribe chan *HubSubscribeInform 
		
	// Channel for HubUnsubscribeInform messages
	OnHubUnsubscribe chan *HubUnsubscribeInform 
		
	// Channel for HubPublishInform messages
	OnHubPublish chan *HubPublishInform 
		
	// Channel for HubEventInform messages
	OnHubEvent chan *HubEventInform 
}

// Connects to the address on the named network.
func (this *TcpChannel) Connect(address string, bufferSize int) (net.Conn, error) {
	// Default is 8K
	if (bufferSize == 0){
		bufferSize = 8192
	}

	// Dial the TCP/IP
	conn, err := net.Dial("tcp", address)
	if err != nil {
		return nil, err
	}

	// The number of pending events per channel
	slots := 2048

	// Create the necessary channels
	this.OnGetAll = make(chan *GetAllInform, slots)
	this.OnCheck = make(chan *CheckInform, slots)
	this.OnGet = make(chan *GetInform, slots)
	this.OnEvent = make(chan *EventInform, slots)
	this.OnPing = make(chan *PingInform, slots)
	this.OnGetServerTime = make(chan *GetServerTimeInform, slots)
	this.OnSupplyCredentials = make(chan *SupplyCredentialsInform, slots)
	this.OnRevokeCredentials = make(chan *RevokeCredentialsInform, slots)
	this.OnHubSubscribe = make(chan *HubSubscribeInform, slots)
	this.OnHubUnsubscribe = make(chan *HubUnsubscribeInform, slots)
	this.OnHubPublish = make(chan *HubPublishInform, slots)
	this.OnHubEvent = make(chan *HubEventInform, slots)
	
	this.state = Open
	this.conn = conn
	this.guard = new(sync.Mutex)

	// Listen
	go this.listen(bufferSize)
	return conn, nil
}

// Dial connects to the given network address using net.Dial
// and then initiates a TLS handshake, returning the resulting
// TLS connection.
func (this *TcpChannel) ConnectTLS(address string, bufferSize int, config *tls.Config) (net.Conn, error) {
	// Default is 8K
	if (bufferSize == 0){
		bufferSize = 8192
	}

	// Dial the TCP/IP
	conn, err := tls.Dial("tcp", address, config)
	if err != nil {
		return nil, err
	}

	this.state = Open
	this.conn = conn

	// Listen
	go this.listen(bufferSize)
	return conn, nil
}


// Disconnects from the remote endpoint
func (this *TcpChannel) Disconnect() (error){
	if (this.state != Open || this.conn == nil){
		return nil
	}

	return this.conn.Close()
}

// Reads from the remote server
func (this *TcpChannel) listen(bufferSize int) (err error) {
	buffer := make([]byte, bufferSize)

	for {

		// Read and close the connection on error
        n, err := this.conn.Read(buffer)
        if err != nil {
            if err != io.EOF {
                this.conn.Close()
        		this.state = Closed
        		return err
            }
            
            time.Sleep(time.Millisecond * 10)
        }

        // Reading offset, as there might be several packets inside
        offset := 0
        for{
        	// If we don't have any bytes, break the loop and go to the read() again
        	if ((n - offset) == 0){
        		break;
        	}

        	// We should have at least 8 bytes available for the read
			if ((n - offset) < 8){
				this.conn.Close()
        		this.state = Closed
        		return err
			}

			// Get the header
			head := bytes.NewBuffer(buffer[offset:offset + 8])

			// Read the length
			var length int32
			err = binary.Read(head, binary.BigEndian, &length)
			if err != nil{
				this.conn.Close()
        		this.state = Closed
        		return err
			}

			length -= 4

			// Read the key
			var key uint32
			err = binary.Read(head, binary.BigEndian, &key)
			if err != nil{
				this.conn.Close()
        		this.state = Closed
        		return err
			}

	
			// Forward to receive
			offset += 8
			this.onReceive(key, buffer[offset:offset + int(length)])
			offset += int(length)
        }
    }

    return nil
}

// Occurs when a packet is received
func (this *TcpChannel) onReceive(key uint32, buffer []byte) error{
	reader := NewPacketReader(buffer)
	switch (key) {
	
		case 0xB22E7270: {
			packet := new(GetAllInform)
			packet.Table, _ = reader.ReadListOfParameter()
	
			select {
    			case this.OnGetAll <- packet:
    			default:
    		}
			return nil
		}
	
		case 0x70D7B183: {
			packet := new(CheckInform)
			packet.Key, _ = reader.ReadString()
			packet.Value, _ = reader.ReadDynamicType()
			packet.Success, _ = reader.ReadBoolean()
	
			select {
    			case this.OnCheck <- packet:
    			default:
    		}
			return nil
		}
	
		case 0x3E05ECEE: {
			packet := new(GetInform)
			packet.Value, _ = reader.ReadDynamicType()
	
			select {
    			case this.OnGet <- packet:
    			default:
    		}
			return nil
		}
	
		case 0xBA220D80: {
			packet := new(EventInform)
			packet.Message, _ = reader.ReadString()
			packet.Time, _ = reader.ReadDateTime()
	
			select {
    			case this.OnEvent <- packet:
    			default:
    		}
			return nil
		}
	
		case 0x26792C94: {
			packet := new(PingInform)
			packet.Pong, _ = reader.ReadBoolean()
	
			select {
    			case this.OnPing <- packet:
    			default:
    		}
			return nil
		}
	
		case 0x33E7FBD1: {
			reader.Decompress()
			packet := new(GetServerTimeInform)
			packet.ServerTime, _ = reader.ReadDateTime()
	
			select {
    			case this.OnGetServerTime <- packet:
    			default:
    		}
			return nil
		}
	
		case 0x8D98E9FC: {
			packet := new(SupplyCredentialsInform)
			packet.Result, _ = reader.ReadBoolean()
	
			select {
    			case this.OnSupplyCredentials <- packet:
    			default:
    		}
			return nil
		}
	
		case 0x4AC51818: {
			packet := new(RevokeCredentialsInform)
			packet.Result, _ = reader.ReadBoolean()
	
			select {
    			case this.OnRevokeCredentials <- packet:
    			default:
    		}
			return nil
		}
	
		case 0x2DD19B9B: {
			packet := new(HubSubscribeInform)
			packet.Status, _ = reader.ReadInt16()
	
			select {
    			case this.OnHubSubscribe <- packet:
    			default:
    		}
			return nil
		}
	
		case 0x6C63B75: {
			packet := new(HubUnsubscribeInform)
			packet.Status, _ = reader.ReadInt16()
	
			select {
    			case this.OnHubUnsubscribe <- packet:
    			default:
    		}
			return nil
		}
	
		case 0x96B41079: {
			packet := new(HubPublishInform)
			packet.Status, _ = reader.ReadInt16()
	
			select {
    			case this.OnHubPublish <- packet:
    			default:
    		}
			return nil
		}
	
		case 0x65B2818C: {
			reader.Decompress()
			packet := new(HubEventInform)
			packet.HubName, _ = reader.ReadString()
			packet.Message, _ = reader.ReadString()
			packet.Time, _ = reader.ReadDateTime()
	
			select {
    			case this.OnHubEvent <- packet:
    			default:
    		}
			return nil
		}
	}

	return errors.New("spike.onReceive: Unknown packet received")
}

// Sends a packet using the writer
func (this *TcpChannel) sendPacket(key uint32, writer *PacketWriter){
	len := writer.buffer.Len() + 4
	if (this.state != Open){
		panic("spike.sendPacket: socket is not connected")
	}

	header := make([]byte, 8)
	header[0] = byte(len >> 24)
	header[1] = byte(len >> 16)
	header[2] = byte(len >> 8)
	header[3] = byte(len)
	header[4] = byte(key >> 24)
	header[5] = byte(key >> 16)
	header[6] = byte(key >> 8)
	header[7] = byte(key)

	// Make sure this part is synchronized
	this.guard.Lock()
	defer this.guard.Unlock()
	this.conn.Write(header)
	writer.buffer.WriteTo(this.conn)
}


		
func (this *TcpChannel) GetAll(){
	writer := NewPacketWriter()
	this.sendPacket(0xB22E7270 , writer)
}		 
		
func (this *TcpChannel) Check(Key string, Value interface{}){
	writer := NewPacketWriter()
	writer.WriteString(Key)
	writer.WriteDynamicType(Value)
	this.sendPacket(0x70D7B183 , writer)
}		 
		
func (this *TcpChannel) Get(Key string){
	writer := NewPacketWriter()
	writer.WriteString(Key)
	this.sendPacket(0x3E05ECEE , writer)
}		 
		
func (this *TcpChannel) Ping(){
	writer := NewPacketWriter()
	this.sendPacket(0x26792C94 , writer)
}		 
		
func (this *TcpChannel) GetServerTime(){
	writer := NewPacketWriter()
	this.sendPacket(0x33E7FBD1 , writer)
}		 
		
func (this *TcpChannel) SupplyCredentials(CredentialsUri string, CredentialsType string, UserName string, Password string, Domain string){
	writer := NewPacketWriter()
	writer.WriteString(CredentialsUri)
	writer.WriteString(CredentialsType)
	writer.WriteString(UserName)
	writer.WriteString(Password)
	writer.WriteString(Domain)
	writer.Compress()
	this.sendPacket(0x8D98E9FC , writer)
}		 
		
func (this *TcpChannel) RevokeCredentials(CredentialsUri string, CredentialsType string){
	writer := NewPacketWriter()
	writer.WriteString(CredentialsUri)
	writer.WriteString(CredentialsType)
	writer.Compress()
	this.sendPacket(0x4AC51818 , writer)
}		 
		
func (this *TcpChannel) HubSubscribe(HubName string, SubscribeKey string){
	writer := NewPacketWriter()
	writer.WriteString(HubName)
	writer.WriteString(SubscribeKey)
	writer.Compress()
	this.sendPacket(0x2DD19B9B , writer)
}		 
		
func (this *TcpChannel) HubUnsubscribe(HubName string, SubscribeKey string){
	writer := NewPacketWriter()
	writer.WriteString(HubName)
	writer.WriteString(SubscribeKey)
	writer.Compress()
	this.sendPacket(0x6C63B75 , writer)
}		 
		
func (this *TcpChannel) HubPublish(HubName string, PublishKey string, Message string){
	writer := NewPacketWriter()
	writer.WriteString(HubName)
	writer.WriteString(PublishKey)
	writer.WriteString(Message)
	writer.Compress()
	this.sendPacket(0x96B41079 , writer)
}