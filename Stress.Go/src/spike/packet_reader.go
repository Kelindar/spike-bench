package spike

 import (
	"encoding/binary"
	"bytes"
	"time"
) 


// Represents a packet reader that can be used to deserialize packets.
type PacketReader struct {
	buffer *bytes.Buffer
}

// Constructs a new reader on the buffer slice
func NewPacketReader(buf []byte) *PacketReader {
	reader := new(PacketReader)
	reader.buffer = bytes.NewBuffer(buf)
	return reader
}

// Decompresses the packet body
func (this *PacketReader) Decompress(){
	this.buffer = bytes.NewBuffer(Decompress(this.buffer.Bytes()))
}

// ------------------ Types ------------------------


// Reads a value from the underlying buffer.
func (this *PacketReader) ReadBoolean() (value bool, err error) {
	var b byte
	err = binary.Read(this.buffer, binary.BigEndian, &b)
	if b == 1 {
		value = true
	}else{
		value = false
	}
	return
}

// Reads a value from the underlying buffer.
func (this *PacketReader) ReadByte() (value byte, err error) {
	err = binary.Read(this.buffer, binary.BigEndian, &value)
	return
}

// Reads a value from the underlying buffer.
func (this *PacketReader) ReadSByte() (value int8, err error) {
	err = binary.Read(this.buffer, binary.BigEndian, &value)
	return
}

// Reads a value from the underlying buffer.
func (this *PacketReader) ReadInt16() (value int16, err error) {
	err = binary.Read(this.buffer, binary.BigEndian, &value)
	return
}

// Reads a value from the underlying buffer.
func (this *PacketReader) ReadInt32() (value int32, err error) {
	err = binary.Read(this.buffer, binary.BigEndian, &value)
	return
}

// Reads a value from the underlying buffer.
func (this *PacketReader) ReadInt64() (value int64, err error) {
	err = binary.Read(this.buffer, binary.BigEndian, &value)
	return
}

// Reads a value from the underlying buffer.
func (this *PacketReader) ReadUInt16() (value uint16, err error) {
	err = binary.Read(this.buffer, binary.BigEndian, &value)
	return
}

// Reads a value from the underlying buffer.
func (this *PacketReader) ReadUInt32() (value uint32, err error) {
	err = binary.Read(this.buffer, binary.BigEndian, &value)
	return
}

// Reads a value from the underlying buffer.
func (this *PacketReader) ReadUInt64() (value uint64, err error) {
	err = binary.Read(this.buffer, binary.BigEndian, &value)
	return
}

// Reads a value from the underlying buffer.
func (this *PacketReader) ReadSingle() (value float32, err error) {
	err = binary.Read(this.buffer, binary.BigEndian, &value)
	return
}

// Reads a value from the underlying buffer.
func (this *PacketReader) ReadDouble() (value float64, err error) {
	err = binary.Read(this.buffer, binary.BigEndian, &value)
	return
}

// Reads a value from the underlying buffer.
func (this *PacketReader) ReadDateTime() (value time.Time, err error) {
	Y, _ := this.ReadInt16()
	M, _ := this.ReadInt16()
	d, _ := this.ReadInt16()
	h, _ := this.ReadInt16()
	m, _ := this.ReadInt16()
	s, _ := this.ReadInt16()
	ms,_ := this.ReadInt16()
	value = time.Date(int(Y), time.Month(int(M)), int(d), int(h), int(m), int(s), int(ms) * 1000000, time.UTC)
	return
}

// Reads a value from the underlying buffer.
func (this *PacketReader) ReadString() (value string, err error) {
	size, _ := this.ReadInt32()
	buf  := make([]byte, size)
	binary.Read(this.buffer, binary.BigEndian, &buf)
	value = string(buf[:size])
	return
}

// Reads a value from the underlying buffer.
func (this *PacketReader) ReadDynamicType() (value interface{}, err error) {
	valid, err := this.ReadBoolean()
	if !valid { 
		return nil, err 
	}

	name, err := this.ReadString()
	switch name {
		case "Boolean": {
			value, err = this.ReadBoolean()
			return
		}
		case "Byte": {
			value, err = this.ReadByte()
			return
		}
		case "SByte": {
			value, err = this.ReadSByte()
			return
		}
		case "Int16": {
			value, err = this.ReadInt16()
			return
		}
		case "Int32": {
			value, err = this.ReadInt32()
			return
		}
		case "Int64": {
			value, err = this.ReadInt64()
			return
		}
		case "UInt16": {
			value, err = this.ReadUInt16()
			return
		}
		case "UInt32": {
			value, err = this.ReadUInt32()
			return
		}
		case "UInt64": {
			value, err = this.ReadUInt64()
			return
		}
		case "Single": {
			value, err = this.ReadSingle()
			return
		}
		case "Double": {
			value, err = this.ReadDouble()
			return
		}
		case "DateTime": {
			value, err = this.ReadDateTime()
			return
		}
		case "String": {
			value, err = this.ReadString()
			return
		}
	}

	return nil, err
}

// Reads a value from the underlying buffer.
func (this *PacketReader) ReadListOfDynamicType() (value []interface{}, err error)  {
	size, _ := this.ReadInt32()
	value = make([]interface{}, size)
	for i := 0; i < int(size); i++ {
		value[i], _ = this.ReadDynamicType()
	}
	return
}

// Reads a value from the underlying buffer.
func (this *PacketReader) ReadListOfBoolean() (value []bool, err error)  {
	size, _ := this.ReadInt32()
	value = make([]bool, size)
	for i := 0; i < int(size); i++ {
		value[i], _ = this.ReadBoolean()
	}
	return
}

// Reads a value from the underlying buffer.
func (this *PacketReader) ReadListOfByte() (value []byte, err error)  {
	size, _ := this.ReadInt32()
	value = make([]byte, size)
	for i := 0; i < int(size); i++ {
		value[i], _ = this.ReadByte()
	}
	return
}

// Reads a value from the underlying buffer.
func (this *PacketReader) ReadListOfSByte() (value []int8, err error)  {
	size, _ := this.ReadInt32()
	value = make([]int8, size)
	for i := 0; i < int(size); i++ {
		value[i], _ = this.ReadSByte()
	}
	return
}

// Reads a value from the underlying buffer.
func (this *PacketReader) ReadListOfInt16() (value []int16, err error)  {
	size, _ := this.ReadInt32()
	value = make([]int16, size)
	for i := 0; i < int(size); i++ {
		value[i], _ = this.ReadInt16()
	}
	return
}

// Reads a value from the underlying buffer.
func (this *PacketReader) ReadListOfInt32() (value []int32, err error)  {
	size, _ := this.ReadInt32()
	value = make([]int32, size)
	for i := 0; i < int(size); i++ {
		value[i], _ = this.ReadInt32()
	}
	return
}

// Reads a value from the underlying buffer.
func (this *PacketReader) ReadListOfInt64() (value []int64, err error)  {
	size, _ := this.ReadInt32()
	value = make([]int64, size)
	for i := 0; i < int(size); i++ {
		value[i], _ = this.ReadInt64()
	}
	return
}

// Reads a value from the underlying buffer.
func (this *PacketReader) ReadListOfUInt16() (value []uint16, err error)  {
	size, _ := this.ReadInt32()
	value = make([]uint16, size)
	for i := 0; i < int(size); i++ {
		value[i], _ = this.ReadUInt16()
	}
	return
}

// Reads a value from the underlying buffer.
func (this *PacketReader) ReadListOfUInt32() (value []uint32, err error)  {
	size, _ := this.ReadInt32()
	value = make([]uint32, size)
	for i := 0; i < int(size); i++ {
		value[i], _ = this.ReadUInt32()
	}
	return
}

// Reads a value from the underlying buffer.
func (this *PacketReader) ReadListOfUInt64() (value []uint64, err error)  {
	size, _ := this.ReadInt32()
	value = make([]uint64, size)
	for i := 0; i < int(size); i++ {
		value[i], _ = this.ReadUInt64()
	}
	return
}

// Reads a value from the underlying buffer.
func (this *PacketReader) ReadListOfSingle() (value []float32, err error)  {
	size, _ := this.ReadInt32()
	value = make([]float32, size)
	for i := 0; i < int(size); i++ {
		value[i], _ = this.ReadSingle()
	}
	return
}

// Reads a value from the underlying buffer.
func (this *PacketReader) ReadListOfDouble() (value []float64, err error)  {
	size, _ := this.ReadInt32()
	value = make([]float64, size)
	for i := 0; i < int(size); i++ {
		value[i], _ = this.ReadDouble()
	}
	return
}

// Reads a value from the underlying buffer.
func (this *PacketReader) ReadListOfDateTime() (value []time.Time, err error)  {
	size, _ := this.ReadInt32()
	value = make([]time.Time, size)
	for i := 0; i < int(size); i++ {
		value[i], _ = this.ReadDateTime()
	}
	return
}

// Reads a value from the underlying buffer.
func (this *PacketReader) ReadListOfString() (value []string, err error)  {
	size, _ := this.ReadInt32()
	value = make([]string, size)
	for i := 0; i < int(size); i++ {
		value[i], _ = this.ReadString()
	}
	return
}


// Reads a value from the underlying buffer.
func (this *PacketReader) ReadParameter() (value Parameter, err error) {
	value.Key, err = this.ReadString()
	value.Value, err = this.ReadDynamicType()
	return
}

// Reads a value from the underlying buffer.
func (this *PacketReader) ReadListOfParameter() (value []Parameter, err error)  {
	size, _ := this.ReadInt32()
	value = make([]Parameter, size)
	for i := 0; i < int(size); i++ {
		value[i], _ = this.ReadParameter()
	}
	return
}