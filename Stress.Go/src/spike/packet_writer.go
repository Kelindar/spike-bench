package spike

 import (
	"encoding/binary"
	"bytes"
	"time"
	"errors"
) 


// Represents a packet writer that can be used to serialize packets.
type PacketWriter struct {
	buffer *bytes.Buffer
}

// Constructs a new writer
func NewPacketWriter() *PacketWriter {
	writer := new(PacketWriter)
	writer.buffer = new(bytes.Buffer)
	return writer
}

// Compresses the packet body
func (this *PacketWriter) Compress(){
	this.buffer = bytes.NewBuffer(Compress(this.buffer.Bytes()))
}


// ------------------ Types ------------------------

// Writes a value to the underlying buffer.
func (this *PacketWriter) WriteBoolean(value bool) error {
	var b byte;
	if(value){
		b = 1
	}
	return binary.Write(this.buffer, binary.BigEndian, b)
}

// Writes a value to the underlying buffer.
func (this *PacketWriter) WriteByte(value byte) error {
	return binary.Write(this.buffer, binary.BigEndian, value)
}

// Writes a value to the underlying buffer.
func (this *PacketWriter) WriteSByte(value int8) error {
	return binary.Write(this.buffer, binary.BigEndian, value)
}

// Writes a value to the underlying buffer.
func (this *PacketWriter) WriteInt8(value int8) error {
	return binary.Write(this.buffer, binary.BigEndian, value)
}

// Writes a value to the underlying buffer.
func (this *PacketWriter) WriteInt16(value int16) error {
	return binary.Write(this.buffer, binary.BigEndian, value)
}

// Writes a value to the underlying buffer.
func (this *PacketWriter) WriteInt32(value int32) error {
	return binary.Write(this.buffer, binary.BigEndian, value)
}

// Writes a value to the underlying buffer.
func (this *PacketWriter) WriteInt64(value int64) error {
	return binary.Write(this.buffer, binary.BigEndian, value)
}

// Writes a value to the underlying buffer.
func (this *PacketWriter) WriteUInt8(value uint8) error {
	return binary.Write(this.buffer, binary.BigEndian, value)
}

// Writes a value to the underlying buffer.
func (this *PacketWriter) WriteUInt16(value uint16) error {
	return binary.Write(this.buffer, binary.BigEndian, value)
}

// Writes a value to the underlying buffer.
func (this *PacketWriter) WriteUInt32(value uint32) error {
	return binary.Write(this.buffer, binary.BigEndian, value)
}

// Writes a value to the underlying buffer.
func (this *PacketWriter) WriteUInt64(value uint64) error {
	return binary.Write(this.buffer, binary.BigEndian, value)
}

// Writes a value to the underlying buffer.
func (this *PacketWriter) WriteSingle(value float32) error {
	return binary.Write(this.buffer, binary.BigEndian, value)
}

// Writes a value to the underlying buffer.
func (this *PacketWriter) WriteDouble(value float64) error {
	return binary.Write(this.buffer, binary.BigEndian, value)
}

// Writes a value to the underlying buffer.
func (this *PacketWriter) WriteString(value string) error {
	this.WriteInt32(int32(len(value)))
	this.buffer.WriteString(value)
	return nil
}

// Writes a value to the underlying buffer.
func (this *PacketWriter) WriteDateTime(value time.Time) error {
	this.WriteInt16(int16(value.Year()))
	this.WriteInt16(int16(value.Month()))
	this.WriteInt16(int16(value.Day()))
	this.WriteInt16(int16(value.Hour()))
	this.WriteInt16(int16(value.Minute()))
	this.WriteInt16(int16(value.Second()))
	this.WriteInt16(int16(value.Nanosecond() / 1000000))
	return nil
}


// Writes a value to the underlying buffer.
func (this *PacketWriter) WriteDynamicType(value interface{}) error {
	if v, ok := value.(bool); ok {
		this.WriteBoolean(true)
		this.WriteString("Boolean")
		this.WriteBoolean(v)
		return nil
	}

	if v, ok := value.(byte); ok {
		this.WriteBoolean(true)
		this.WriteString("Byte")
		this.WriteByte(v)
		return nil
	}

	if v, ok := value.(int8); ok {
		this.WriteBoolean(true)
		this.WriteString("SByte")
		this.WriteSByte(v)
		return nil
	}

	if v, ok := value.(int16); ok {
		this.WriteBoolean(true)
		this.WriteString("Int16")
		this.WriteInt16(v)
		return nil
	}

	if v, ok := value.(int32); ok {
		this.WriteBoolean(true)
		this.WriteString("Int32")
		this.WriteInt32(v)
		return nil
	}

	if v, ok := value.(int64); ok {
		this.WriteBoolean(true)
		this.WriteString("Int64")
		this.WriteInt64(v)
		return nil
	}

	if v, ok := value.(uint16); ok {
		this.WriteBoolean(true)
		this.WriteString("UInt16")
		this.WriteUInt16(v)
		return nil
	}

	if v, ok := value.(uint32); ok {
		this.WriteBoolean(true)
		this.WriteString("UInt32")
		this.WriteUInt32(v)
		return nil
	}

	if v, ok := value.(uint64); ok {
		this.WriteBoolean(true)
		this.WriteString("UInt64")
		this.WriteUInt64(v)
		return nil
	}

	if v, ok := value.(float32); ok {
		this.WriteBoolean(true)
		this.WriteString("Single")
		this.WriteSingle(v)
		return nil
	}

	if v, ok := value.(float64); ok {
		this.WriteBoolean(true)
		this.WriteString("Double")
		this.WriteDouble(v)
		return nil
	}

	if v, ok := value.(time.Time); ok {
		this.WriteBoolean(true)
		this.WriteString("DateTime")
		this.WriteDateTime(v)
		return nil
	}

	if v, ok := value.(string); ok {
		this.WriteBoolean(true)
		this.WriteString("String")
		this.WriteString(v)
		return nil
	}

   	return errors.New("spike.writeDynamicType: incompatible type")
}

// Writes a value to the underlying buffer.
func (this *PacketWriter) WriteListOfBoolean(value []bool) error {
	this.WriteInt32(int32(len(value)))
	for _, v := range value{
		err := this.WriteBoolean(v)
		if (err != nil){
			return err
		}
	}
	return nil
}

// Writes a value to the underlying buffer.
func (this *PacketWriter) WriteListOfByte(value []byte) error {
	this.WriteInt32(int32(len(value)))
	for _, v := range value{
		err := this.WriteByte(v)
		if (err != nil){
			return err
		}
	}
	return nil
}

// Writes a value to the underlying buffer.
func (this *PacketWriter) WriteListOfSByte(value []int8) error {
	this.WriteInt32(int32(len(value)))
	for _, v := range value{
		err := this.WriteSByte(v)
		if (err != nil){
			return err
		}
	}
	return nil
}

// Writes a value to the underlying buffer.
func (this *PacketWriter) WriteListOfInt16(value []int16) error {
	this.WriteInt32(int32(len(value)))
	for _, v := range value{
		err := this.WriteInt16(v)
		if (err != nil){
			return err
		}
	}
	return nil
}

// Writes a value to the underlying buffer.
func (this *PacketWriter) WriteListOfInt32(value []int32) error {
	this.WriteInt32(int32(len(value)))
	for _, v := range value{
		err := this.WriteInt32(v)
		if (err != nil){
			return err
		}
	}
	return nil
}

// Writes a value to the underlying buffer.
func (this *PacketWriter) WriteListOfInt64(value []int64) error {
	this.WriteInt32(int32(len(value)))
	for _, v := range value{
		err := this.WriteInt64(v)
		if (err != nil){
			return err
		}
	}
	return nil
}

// Writes a value to the underlying buffer.
func (this *PacketWriter) WriteListOfUInt16(value []uint16) error {
	this.WriteInt32(int32(len(value)))
	for _, v := range value{
		err := this.WriteUInt16(v)
		if (err != nil){
			return err
		}
	}
	return nil
}

// Writes a value to the underlying buffer.
func (this *PacketWriter) WriteListOfUInt32(value []uint32) error {
	this.WriteInt32(int32(len(value)))
	for _, v := range value{
		err := this.WriteUInt32(v)
		if (err != nil){
			return err
		}
	}
	return nil
}

// Writes a value to the underlying buffer.
func (this *PacketWriter) WriteListOfUInt64(value []uint64) error {
	this.WriteInt32(int32(len(value)))
	for _, v := range value{
		err := this.WriteUInt64(v)
		if (err != nil){
			return err
		}
	}
	return nil
}

// Writes a value to the underlying buffer.
func (this *PacketWriter) WriteListOfSingle(value []float32) error {
	this.WriteInt32(int32(len(value)))
	for _, v := range value{
		err := this.WriteSingle(v)
		if (err != nil){
			return err
		}
	}
	return nil
}

// Writes a value to the underlying buffer.
func (this *PacketWriter) WriteListOfDouble(value []float64) error {
	this.WriteInt32(int32(len(value)))
	for _, v := range value{
		err := this.WriteDouble(v)
		if (err != nil){
			return err
		}
	}
	return nil
}

// Writes a value to the underlying buffer.
func (this *PacketWriter) WriteListOfDateTime(value []time.Time) error {
	this.WriteInt32(int32(len(value)))
	for _, v := range value{
		err := this.WriteDateTime(v)
		if (err != nil){
			return err
		}
	}
	return nil
}

// Writes a value to the underlying buffer.
func (this *PacketWriter) WriteListOfString(value []string) error {
	this.WriteInt32(int32(len(value)))
	for _, v := range value{
		err := this.WriteString(v)
		if (err != nil){
			return err
		}
	}
	return nil
}


// Writes a value to the underlying buffer.
func (this *PacketWriter) WriteListOfDynamicType(value []interface{}) error {
	this.WriteInt32(int32(len(value)))
	for _, v := range value{
		err := this.WriteDynamicType(v)
		if (err != nil){
			return err
		}
	}
	return nil
}

// Writes a value to the underlying buffer.
func (this *PacketWriter) WriteParameter(value Parameter) error {
	this.WriteString(value.Key);
	this.WriteDynamicType(value.Value);
	return nil
}

// Writes a value to the underlying buffer.
func (this *PacketWriter) WriteListOfParameter(value []Parameter) error {
	this.WriteInt32(int32(len(value)))
	for _, v := range value{
		err := this.WriteParameter(v)
		if (err != nil){
			return err
		}
	}
	return nil
}