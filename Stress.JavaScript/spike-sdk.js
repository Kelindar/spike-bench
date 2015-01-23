

 if(typeof spike === 'undefined')
	spike = new Object();

// Whether we should or not use native binary support
//spike.binarySupport = ((typeof Uint8Array !== 'undefined') && (typeof DataView !== 'undefined'));
spike.binarySupport = false;
spike.ByteArray = function(){
	this.position = 0;
	this.bigEndian = true;
	this.allowExceptions = true;

	if(spike.binarySupport)
	{
		this.data  = new ArrayBuffer(0);
		this._size = this._maxSize = this.data.byteLength;
		this.view  = new DataView(this.data);
	}
	else
	{
		this.data = [];
	}
};
with({p: spike.ByteArray.prototype}){

	/* Ensures the capacity for n bytes in this array, resizes if necessary */
	p.ensureCapacity = function(length) {
		if(this._maxSize > this.position + length)
			return;

		// Resize by 1024 and build a data view
		var baseArrayBuffer = this.data;
		var newByteSize = this._maxSize + Math.max(1024, length);
		var resizedArrayBuffer = new ArrayBuffer(newByteSize),
			len = baseArrayBuffer.byteLength,
			resizeLen = (len > newByteSize)? newByteSize : len;

			(new Uint8Array(resizedArrayBuffer, 0, resizeLen)).set(new Uint8Array(baseArrayBuffer, 0, resizeLen));

		this.data = resizedArrayBuffer;
		this.view = new DataView(this.data);
		this._maxSize = newByteSize; 
	};


	/* Writes a floating-point value to the underlying buffer. */
	p.string_writeFloat = function(number, precisionBits, exponentBits){
		var bias = Math.pow(2, exponentBits - 1) - 1, minExp = -bias + 1, maxExp = bias, minUnnormExp = minExp - precisionBits,
		status = isNaN(n = parseFloat(number)) || n == -Infinity || n == +Infinity ? n : 0,
		exp = 0, len = 2 * bias + 1 + precisionBits + 3, bin = new Array(len),
		signal = (n = status !== 0 ? 0 : n) < 0, n = Math.abs(n), intPart = Math.floor(n), floatPart = n - intPart,
		i, lastBit, rounded, j, result;
		for(i = len; i; bin[--i] = 0);
		for(i = bias + 2; intPart && i; bin[--i] = intPart % 2, intPart = Math.floor(intPart / 2));
		for(i = bias + 1; floatPart > 0 && i; (bin[++i] = ((floatPart *= 2) >= 1) - 0) && --floatPart);
		for(i = -1; ++i < len && !bin[i];);
		if(bin[(lastBit = precisionBits - 1 + (i = (exp = bias + 1 - i) >= minExp && exp <= maxExp ? i + 1 : bias + 1 - (exp = minExp - 1))) + 1]){
			if(!(rounded = bin[lastBit]))
				for(j = lastBit + 2; !rounded && j < len; rounded = bin[j++]);
			for(j = lastBit + 1; rounded && --j >= 0; (bin[j] = !bin[j] - 0) && (rounded = 0));
		}
		for(i = i - 2 < 0 ? -1 : i - 3; ++i < len && !bin[i];);

		(exp = bias + 1 - i) >= minExp && exp <= maxExp ? ++i : exp < minExp &&
			(exp != bias + 1 - len && exp < minUnnormExp && this.warn('encodeFloat::float underflow'), i = bias + 1 - (exp = minExp - 1));
		(intPart || status !== 0) && (this.warn(intPart ? 'encodeFloat::float overflow' : 'encodeFloat::' + status),
			exp = maxExp + 1, i = bias + 2, status == -Infinity ? signal = 1 : isNaN(status) && (bin[i] = 1));
		for(n = Math.abs(exp + bias), j = exponentBits + 1, result = ''; --j; result = (n % 2) + result, n = n >>= 1);
		for(n = 0, j = 0, i = (result = (signal ? '1' : '0') + result + bin.slice(i, i + precisionBits).join('')).length, r = [];
			i; n += (1 << j) * result.charAt(--i), j == 7 && (r[r.length] = String.fromCharCode(n), n = 0), j = (j + 1) % 8);
		r[r.length] = n ? String.fromCharCode(n) : '';
		this.data += (this.bigEndian ? r.reverse() : r).join('');
	};

	/* Writes a floating-point value to the underlying buffer. */
	p.native_writeFloat = function(number, precisionBits, exponentBits){
		var bits = precisionBits + exponentBits + 1;
		this.ensureCapacity(bits / 8);
		switch(bits)
		{
			case 32:
				this.view.setFloat32(this.position, number, !this.bigEndian);
				this.position += 4;
				this._size += 4;
				return;

			case 64:
				this.view.setFloat64(this.position, number, !this.bigEndian);
				this.position += 8;
				this._size += 8;
				return;
		}
	};

	/* Writes a floating-point value to the underlying buffer. */
	p.writeFloat = spike.binarySupport ? p.native_writeFloat : p.string_writeFloat;

	/* Writes a integral value to the underlying buffer. */
	p.string_writeInt = function(number, bits, signed){
		if(bits == 64){
			this.write64(number);
			return;
		};

	    var max = Math.pow(2, bits), r = [];
	    var maxs = Math.pow(2, bits - 1);
		(signed && (number >= maxs || number < -maxs)) && this.warn('writeInt::overflow') && (number = 0);
		(!signed && (number >= max || (number < -(max >> 1)))) && this.warn('writeUInt::overflow') && (number = 0);
		number < 0 && (number += max);
		for(; number; r[r.length] = String.fromCharCode(number % 256), number = Math.floor(number / 256));
		for(bits = -(-bits >> 3) - r.length; bits--; r[r.length] = '\0');
		this.data += (this.bigEndian ? r.reverse() : r).join('');
	};

	/* Writes a integral value to the underlying buffer. */
	p.native_writeInt = function(number, bits, signed){
		this.ensureCapacity(bits / 8);
		if(signed)
		{
			switch(bits)
			{
				case 8:
					this.view.setInt8(this.position, number);
					this.position += 1;
					this._size += 1;
					return;

				case 16:
					this.view.setInt16(this.position, number, !this.bigEndian);
					this.position += 2;
					this._size += 2;
					return;

				case 32:
					this.view.setInt32(this.position, number, !this.bigEndian);
					this.position += 4;
					this._size += 4;
					return;

				case 64:
					this.write64(number);
					return;
			}
		}
		else
		{
			switch(bits)
			{
				case 8:
					this.view.setUint8(this.position, number);
					this.position += 1;
					this._size += 1;
					return;

				case 16:
					this.view.setUint16(this.position, number, !this.bigEndian);
					this.position += 2;
					this._size += 2;
					return;

				case 32:
					this.view.setUint32(this.position, number, !this.bigEndian);
					this.position += 4;
					this._size += 4;
					return;

				case 64:
					this.write64(number);
					return;
			}
		}
	};
	
	/* Writes a integral value to the underlying buffer. */
	p.writeInt = spike.binarySupport ? p.native_writeInt : p.string_writeInt;

	/* Writes an unsigned byte value to the underlying buffer. */
	p.writeByte = function(number){
		this.writeInt(number, 8, false);
	};

	/* Writes bytes to the underlying buffer. */
	p.string_writeBytes = function(bytes){
		this.data += bytes;
	};

	/* Writes bytes to the underlying buffer. */
	p.native_writeBytes = function(bytes){
		this.ensureCapacity(bytes.length);
		var v = new Uint8Array(this.data, this.position, bytes.length);
		v.set(bytes, 0);
		this.position += bytes.length;
		this._size += bytes.length;
	};

	/* Writes bytes to the underlying buffer. */
	p.writeBytes = spike.binarySupport ? p.native_writeBytes : p.string_writeBytes;

	
	/* Writes a series of hex bytes and presents it as a 0x.. formatted string */
	p.write64 = function(hex){
		if(hex.length != 20)
			throw new Error('UInt64 or Int16 must be a string of exactly 20 bytes');
		var type = hex.substring(0, 4);
		if(type != '-64x' && type != '+64x')
			throw new Error('UInt64 or Int16 must start with +64x or -64x');
		
		hex = hex.slice(4);
		for (var i = 0; i < 16; i+=2){
			var v = parseInt('' + hex[i] + hex[i + 1], 16);
			this.writeByte(v);
		}
	};


	/* Reads a floating-point value from the underlying buffer. */
	p.string_readFloat = function(precisionBits, exponentBits){
		var blen = (precisionBits + exponentBits + 1) / 8;
		var data = this.data.slice(this.position, this.position + blen);
		this.position += blen;
		var b = ((b = new this.Buffer(this.bigEndian, data)).checkBuffer(precisionBits + exponentBits + 1), b),
			bias = Math.pow(2, exponentBits - 1) - 1, signal = b.readBits(precisionBits + exponentBits, 1),
			exponent = b.readBits(precisionBits, exponentBits), significand = 0,
			divisor = 2, curByte = b.buffer.length + (-precisionBits >> 3) - 1,
			byteValue, startBit, mask;
		do
			for(byteValue = b.buffer[ ++curByte ], startBit = precisionBits % 8 || 8, mask = 1 << startBit;
				mask >>= 1; (byteValue & mask) && (significand += 1 / divisor), divisor *= 2);
		while(precisionBits -= startBit);
		return exponent == (bias << 1) + 1 ? significand ? NaN : signal ? -Infinity : +Infinity
			: (1 + signal * -2) * (exponent || significand ? !exponent ? Math.pow(2, -bias + 1) * significand
			: Math.pow(2, exponent - bias) * (1 + significand) : 0);
	};

	/* Reads a floating-point value from the underlying buffer. */
	p.native_readFloat = function(precisionBits, exponentBits){
		var bits = (precisionBits + exponentBits + 1);
		var value = 0;
		switch(bits)
		{
			case 32:
				value = this.view.getFloat32(this.position, !this.bigEndian);
				this.position += 4;
				return value;

			case 64:
				value = this.view.getFloat64(this.position, !this.bigEndian);
				this.position += 8;
				return value;
		}
	};

	/* Reads a floating-point value from the underlying buffer. */
	p.readFloat = spike.binarySupport ? p.native_readFloat : p.string_readFloat;

	/* Reads an integral value from the underlying buffer. */
	p.string_readInt = function(bits, signed){
		if(bits == 64) return this.read64(signed);
		var blen = bits / 8;
		var data = this.data.slice(this.position, this.position + blen);
		this.position += blen;
		var b = new this.Buffer(this.bigEndian, data), x = b.readBits(0, bits), max = Math.pow(2, bits);
		return signed && x >= max / 2 ? x - max : x;
	};

	/* Reads an integral value from the underlying buffer. */
	p.native_readInt = function(bits, signed){
		var value = 0;
		if(signed)
		{
			switch(bits)
			{
				case 8:
					value = this.view.getInt8(this.position);
					this.position += 1;
					return value < 0x80 ? value : value - 0x100;

				case 16:
					value = this.view.getInt16(this.position, !this.bigEndian);
					this.position += 2;
					return value;

				case 32:
					value = this.view.getInt32(this.position, !this.bigEndian);
					this.position += 4;
					return value;

				case 64:
					value = this.read64(signed);
					//console.log('Int64 is not supported in JavaScript, decoded ' + value + ' as a string.');
					return value;
			}
		}
		else
		{
			switch(bits)
			{
				case 8:
					value =  this.view.getUint8(this.position);
					this.position += 1;
					return value;

				case 16:
					value = this.view.getUint16(this.position, !this.bigEndian);
					this.position += 2;
					return value;

				case 32:
					value = this.view.getUint32(this.position, !this.bigEndian);
					this.position += 4;
					return value;

				case 64:
					value = this.read64(signed);
					//console.log('UInt64 is not supported in JavaScript, decoded ' + value + ' as a string.');
					return value;
			}
		}
	}

	/* Reads an integral value from the underlying buffer. */
	p.readInt = spike.binarySupport ? p.native_readInt : p.string_readInt;

	/* Reads an unsigned byte value from the underlying buffer. */
	p.readByte = function(){
		return this.readInt(8, false);
	};

	/* Reads bytes from the underlying buffer. */
	p.string_readBytes = function(count){
		var r = this.data.slice(this.position, this.position + count);
		this.position += count;
		return r;
	};

	/* Reads bytes from the underlying buffer. */
	p.native_readBytes = function(count){
		var r = new Uint8Array(this.data, this.position, count);
		this.position += count;
		return r;
	};

	/* Reads bytes from the underlying buffer. */
	p.readBytes = spike.binarySupport ? p.native_readBytes : p.string_readBytes;

	/* Private padding of a string for HEX encoding */
	p._padN = function(str, width) {
	  return str.length >= width ? str : new Array(width - str.length + 1).join('0') + str;
	};

	/* Private padding of a string for HEX encoding */
	p._pad2 = function(str) {
		return (str.length < 2) ? "0" + str : str;
	};

	/* Reads a series of hex bytes and presents it as a 0x.. formatted string */
	p.read64 = function(signed){
		var b16 = '';
		for(var i = 0; i < 8; ++i){
			b16 += this._pad2(this.getAt(this.position).toString(16));
			this.position++;
		}
		return (signed ? '-64x' : '+64x') + b16;
	};

	/* Gets a byte value on a specified position */
	p.string_getAt = function(index){
		return this.data.charCodeAt(index) & 0xff;
	};

	/* Gets a byte value on a specified position */
	p.native_getAt = function(index){
		return this.view.getUint8(index);
	};

	/* Reads bytes from the underlying buffer. */
	p.getAt = spike.binarySupport ? p.native_getAt : p.string_getAt;

	/* Appends the underlying buffer data to the specified buffer. */
	p.readBytesTo = function(targetBuffer, count){
		targetBuffer.writeBytes( this.readBytes(count) );
	};


	/* Appends the underlying buffer data to the specified buffer. */
	p.string_getSize = function(){
		return this.data.length;
	};

	/* Appends the underlying buffer data to the specified buffer. */
	p.native_getSize = function(){
		return this._size;
	};

	/* Appends the underlying buffer data to the specified buffer. */
	p.getSize = spike.binarySupport ? p.native_getSize : p.string_getSize;

	/* Gets the byte array data as base64 encoded string */
	p.string_toBase64 = function(){
		var cleanBuffer = new Array();
		var result = "";

	   	for(var i=0; i<this.getSize(); ++i)
			cleanBuffer.push(this.getAt(i));
		for (var i = 0; i < cleanBuffer.length; i++)
			result += String.fromCharCode(cleanBuffer[i]);	

		if (typeof(btoa) === 'function') {
			return btoa(result);
		} else {
			return this._btoa(result);
		}
	};

	/* Gets the byte array data as base64 encoded string */
	p.native_toBase64 = function(){
		//var array = (new Uint8Array(this.data)).subarray(0, this._size);
		var array = new Uint8Array(this.data, 0, this._size);
		var text  = String.fromCharCode.apply(null, array);

		return (typeof(btoa) === 'function') 
			? btoa(text) 
			: this._btoa(text);
	};

	/* Gets the byte array data as base64 encoded string */
	p.toBase64 = spike.binarySupport ? p.native_toBase64 : p.string_toBase64;

	/* Gets the underlying buffer slice */
	p.toBuffer = function(){
		var p = this.position;
		this.position = 0;
		var b = this.readBytes(this.getSize());
		this.position = p;
		return b;
	};

	/* Writes base 64 encoded string to the buffer after decoding it */
	p.string_writeBase64 = function(input){
		if (typeof(atob) === 'function') {
			this.writeBytes(atob(input));
		} else {
			this.writeBytes(this._atob(input));
		}
	};

	/* Writes base 64 encoded string to the buffer after decoding it */
	p.native_writeBase64 = function(input){
		var array = new Uint8Array(atob(input).split("").map(function(c) { return c.charCodeAt(0); }));
		this.writeBytes(array);
	};

	/* Writes base 64 encoded string to the buffer after decoding it */
	p.writeBase64 = spike.binarySupport ? p.native_writeBase64 : p.string_writeBase64;


     /* btoa() for Internet Explorer */
     p._btoa = function(str) {
          var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
          var encoded = [];
          var c = 0;
          while (c < str.length) {
              var b0 = str.charCodeAt(c++);
              var b1 = str.charCodeAt(c++);
              var b2 = str.charCodeAt(c++);
              var buf = (b0 << 16) + ((b1 || 0) << 8) + (b2 || 0);
              var i0 = (buf & (63 << 18)) >> 18;
              var i1 = (buf & (63 << 12)) >> 12;
              var i2 = isNaN(b1) ? 64 : (buf & (63 << 6)) >> 6;
              var i3 = isNaN(b2) ? 64 : (buf & 63);
              encoded[encoded.length] = chars.charAt(i0);
              encoded[encoded.length] = chars.charAt(i1);
              encoded[encoded.length] = chars.charAt(i2);
              encoded[encoded.length] = chars.charAt(i3);
          }
          return encoded.join('');
      };

	/* atob() for Internet Explorer */
	p._atob = function(input) {
	    var b64array = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
	    var output = "";
	    var hex = "";
	    var chr1, chr2, chr3 = "";
	    var enc1, enc2, enc3, enc4 = "";
	    var i = 0;
	
	    input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
	
	    do {
	        enc1 = b64array.indexOf(input.charAt(i++));
	        enc2 = b64array.indexOf(input.charAt(i++));
	        enc3 = b64array.indexOf(input.charAt(i++));
	        enc4 = b64array.indexOf(input.charAt(i++));
	        
	        chr1 = (enc1 << 2) | (enc2 >> 4);
	        chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
	        chr3 = ((enc3 & 3) << 6) | enc4;
	        
	        output = output + String.fromCharCode(chr1);
	        
	        if (enc3 != 64) {
	            output = output + String.fromCharCode(chr2);
	        }
	        if (enc4 != 64) {
	            output = output + String.fromCharCode(chr3);
	        }
	    
	        chr1 = chr2 = chr3 = "";
	        enc1 = enc2 = enc3 = enc4 = "";
	    
	    } while (i < input.length);

	    return output;
	};


	with({p: (p.Buffer = function(bigEndian, buffer){
		this.bigEndian = bigEndian || 0, this.buffer = [], this.setBuffer(buffer);
	}).prototype}){
		p.readBits = function(start, length){
			function shl(a, b){
				for(++b; --b; a = ((a %= 0x7fffffff + 1) & 0x40000000) == 0x40000000 ? a * 2 : (a - 0x40000000) * 2 + 0x7fffffff + 1);
				return a;
			}
			if(start < 0 || length <= 0)
				return 0;
			this.checkBuffer(start + length);
			for(var offsetLeft, offsetRight = start % 8, curByte = this.buffer.length - (start >> 3) - 1,
				lastByte = this.buffer.length + (-(start + length) >> 3), diff = curByte - lastByte,
				sum = ((this.buffer[ curByte ] >> offsetRight) & ((1 << (diff ? 8 - offsetRight : length)) - 1))
				+ (diff && (offsetLeft = (start + length) % 8) ? (this.buffer[ lastByte++ ] & ((1 << offsetLeft) - 1))
				<< (diff-- << 3) - offsetRight : 0); diff; sum += shl(this.buffer[ lastByte++ ], (diff-- << 3) - offsetRight)
			);
			return sum;
		};
		p.setBuffer = function(data){
			if(data){
				for(var l, i = l = data.length, b = this.buffer = new Array(l); i; b[l - i] = data.charCodeAt(--i));
				this.bigEndian && b.reverse();
			}
		};
		p.hasNeededBits = function(neededBits){
			return this.buffer.length >= -(-neededBits >> 3);
		};
		p.checkBuffer = function(neededBits){
			if(!this.hasNeededBits(neededBits))
				throw new Error('checkBuffer::missing bytes');
		};
	}
	p.warn = function(msg){
		if(this.allowExceptions)
			throw new Error(msg);
		return 1;
	};

} /*
* JavaScript LibLZF Port:
* Copyright (c) 2011 Roman Atachiants <kelindar@gmail.com>
* 
* Original CLZF C# Port:
* Copyright (c) 2005 Oren J. Maurice <oymaurice@hazorea.org.il>
* 
* Original LibLZF Library & Algorithm:
* Copyright (c) 2000-2008 Marc Alexander Lehmann <schmorp@schmorp.de>
* 
* Redistribution and use in source and binary forms, with or without modifica-
* tion, are permitted provided that the following conditions are met:
* 
*   1.  Redistributions of source code must retain the above copyright notice,
*       this list of conditions and the following disclaimer.
* 
*   2.  Redistributions in binary form must reproduce the above copyright
*       notice, this list of conditions and the following disclaimer in the
*       documentation and/or other materials provided with the distribution.
* 
*   3.  The name of the author may not be used to endorse or promote products
*       derived from this software without specific prior written permission.
* 
* THIS SOFTWARE IS PROVIDED BY THE AUTHOR ``AS IS'' AND ANY EXPRESS OR IMPLIED
* WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MER-
* CHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.  IN NO
* EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPE-
* CIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
* PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
* OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
* WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTH-
* ERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED
* OF THE POSSIBILITY OF SUCH DAMAGE.
*
* Alternatively, the contents of this file may be used under the terms of
* the GNU General Public License version 2 (the "GPL"), in which case the
* provisions of the GPL are applicable instead of the above. If you wish to
* allow the use of your version of this file only under the terms of the
* GPL and not to allow others to use your version of this file under the
* BSD license, indicate your decision by deleting the provisions above and
* replace them with the notice and other provisions required by the GPL. If
* you do not delete the provisions above, a recipient may use your version
* of this file under either the BSD or the GPL.
*/

spike.PacketCompressor = function()
{
	this.HLOG = 14;
	this.HSIZE = (1 << 14);
	this.MAX_LIT = (1 << 5);
	this.MAX_OFF = (1 << 13);
	this.MAX_REF = ((1 << 8) + (1 << 3));

	//private var HashTable:Array = new Array(this.HSIZE);		
	this.HashTable = new Array(this.HSIZE);		
	
	/* Compresses the data using LibLZF algorithm */
	this.compress = function(input, inputLength)
	{
		this.HashTable.splice(0, this.HSIZE);
		
		var output = new spike.ByteArray();
		
		var hslot;
		var iidx = 0;
		var oidx = 0;
		var reference;
		
		var hval = (((input.getAt(iidx)) << 8) | input.getAt(iidx + 1)); // FRST(in_data, iidx);
		var off;
		var lit = 0;
		
		for (; ; )
		{
			if (iidx < inputLength - 2)
			{
				hval = (hval << 8) | input.getAt(iidx + 2);
				hslot = ((hval ^ (hval << 5)) >> (((3 * 8 - this.HLOG)) - hval * 5) & (this.HSIZE - 1));
				reference = this.HashTable[hslot];
				this.HashTable[hslot] = iidx;
				
				
				if ((off = iidx - reference - 1) < this.MAX_OFF
					&& iidx + 4 < inputLength
					&& reference > 0
					&& input.getAt(reference + 0) == input.getAt(iidx + 0)
					&& input.getAt(reference + 1) == input.getAt(iidx + 1)
					&& input.getAt(reference + 2) == input.getAt(iidx + 2)
				)
				{
					/* match found at *reference++ */
					var len = 2;
					var maxlen = inputLength - iidx - len;
					maxlen = maxlen > this.MAX_REF ? this.MAX_REF : maxlen;
					
					do
						len++;
					while (len < maxlen && input.getAt(reference + len) == input.getAt(iidx + len));
					
					if (lit != 0)
					{
						oidx++;
						output.writeByte(lit - 1);
						lit = -lit;
						do
						{
							oidx++;
							output.writeByte(input.getAt(iidx + lit));
						}
						while ((++lit) != 0);
					}
					
					len -= 2;
					iidx++;
					
					if (len < 7)
					{
						oidx++;
						output.writeByte((off >> 8) + (len << 5));
					}
					else
					{
						oidx++;
						oidx++;
						output.writeByte((off >> 8) + (7 << 5));
						output.writeByte(len - 7);
					}
					
					oidx++;
					output.writeByte(off);
					
					iidx += len - 1;
					hval = (((input.getAt(iidx)) << 8) | input.getAt(iidx + 1)); 
					
					hval = (hval << 8) | input.getAt(iidx + 2);
					this.HashTable[((hval ^ (hval << 5)) >> (((3 * 8 - this.HLOG)) - hval * 5) & (this.HSIZE - 1))] = iidx;
					iidx++;
					
					hval = (hval << 8) | input.getAt(iidx + 2);
					this.HashTable[((hval ^ (hval << 5)) >> (((3 * 8 - this.HLOG)) - hval * 5) & (this.HSIZE - 1))] = iidx;
					iidx++;
					continue;
				}
			}
			else if (iidx == inputLength)
				break;
			
			/* one more literal byte we must copy */
			lit++;
			iidx++;
			
			if (lit == this.MAX_LIT)
			{
				oidx++;
				output.writeByte((this.MAX_LIT - 1));
				lit = -lit;
				do
				{
					oidx++;
					output.writeByte(input.getAt(iidx + lit));
				}
				while ((++lit) != 0);
			}
		}
		
		if (lit != 0)
		{
			oidx++;
			output.writeByte((lit - 1));
			lit = -lit;
			do
			{
				oidx++;
				output.writeByte(input.getAt(iidx + lit));
			}
			while ((++lit) != 0);
		}
		
		output.length = oidx;
		return output;
	}
	
	/* Decompresses the data using LibLZF algorithm */
	this.decompress = function(input, inputLength)
	{
		var iidx = 0 | 0;
		var oidx = 0 | 0;
		var output = new spike.ByteArray();

		do
		{
			var ctrl = input.getAt(iidx);
			iidx++;
			
			if (ctrl < (1 << 5)) /* literal run */
			{
				ctrl++;
				
				do
				{
					output.writeByte(input.getAt(iidx));
					iidx++;
					oidx++;
				}
				while ((--ctrl) != 0);
			}
			else /* back reference */
			{
				var len = ctrl >> 5;
				var reference = (oidx - ((ctrl & 0x1f) << 8) - 1);
				
				if (len == 7){
					len += input.getAt(iidx);
					iidx++;
				}
				
				reference -= input.getAt(iidx);
				iidx++;
				
				if (reference < 0)
				{
					//SET_ERRNO (EINVAL);
					output.length = 0;
					return output;
				}

				output.writeByte(output.getAt(reference));
				reference++;
				oidx++;
				output.writeByte(output.getAt(reference));
				reference++;
				oidx++;
				
				do
				{
					output.writeByte(output.getAt(reference));
					reference++;
					oidx++;
				}
				while ((--len) != 0);
			}
		}
		while (iidx < inputLength);
		
		output.length = oidx;
		return output;
	}
	
}; spike.PacketWriter = function(bufferTowrite){
	this.buffer = new spike.ByteArray();
}

/* Compresses the packet */
spike.PacketWriter.prototype.compress = function()
{			
	this.buffer = new spike.PacketCompressor().compress(this.buffer, this.buffer.getSize());
}	
	
spike.PacketWriter.prototype.writeBoolean = function(value){
	if(value){
		this.buffer.writeInt(1, 8, false);
	}else{
		this.buffer.writeInt(0, 8, false);
	}
}
	
spike.PacketWriter.prototype.writeKey = function(value){
	for(var i=0; i < 8; i+=2)
	{
		var s = value.charAt(i) + value.charAt(i + 1);
		var b = parseInt(s, 16);
		this.buffer.writeInt(b, 8, false);
	}
}

spike.PacketWriter.prototype.writeByte = function(value){
	this.buffer.writeInt(value, 8, false);
}
	
spike.PacketWriter.prototype.writeSByte = function(value){
	this.buffer.writeInt(value, 8, true);
}
	
spike.PacketWriter.prototype.writeInt16 = function(value){
	this.buffer.writeInt(value, 16, true);
}
	
spike.PacketWriter.prototype.writeInt32 = function(value){
	this.buffer.writeInt(value, 32, true);
}
	
spike.PacketWriter.prototype.writeInt64 = function(value){
	this.buffer.writeInt(value, 64, true);
}
	
spike.PacketWriter.prototype.writeUInt16 = function(value){
	this.buffer.writeInt(value, 16, false);
}
	
spike.PacketWriter.prototype.writeUInt32 = function(value){
	this.buffer.writeInt(value, 32, false);
}
	
spike.PacketWriter.prototype.writeUInt64 = function(value){
	this.buffer.writeInt(value, 64, false);
}

spike.PacketWriter.prototype.writeDateTime = function(value){
	this.writeInt16(value.getFullYear());
	this.writeInt16(value.getMonth() + 1);
	this.writeInt16(value.getDate());
	this.writeInt16(value.getHours());
	this.writeInt16(value.getMinutes());
	this.writeInt16(value.getSeconds());
	this.writeInt16(value.getMilliseconds());
}

spike.PacketWriter.prototype.writeSingle = function(value){
	this.buffer.writeFloat(value, 23, 8);
}
	
spike.PacketWriter.prototype.writeDouble = function(value){
	this.buffer.writeFloat(value, 52, 11);
}
	
spike.PacketWriter.prototype.writeString = function(value){
	if(value == 'undefined' || value == null || value.length == 0){
		this.writeInt32(0);		
	}else{
		value = unescape(encodeURIComponent(value));

		if(spike.binarySupport){
			var buf = new ArrayBuffer(value.length);
			var u8  = new Uint8Array(buf);
			for (var i=0, len=value.length; i<len; ++i)
				u8[i] = value.charCodeAt(i);
			value = u8;
		}

		this.writeInt32(value.length);
		this.buffer.writeBytes(value);
	}
}

spike.PacketWriter.prototype.writeDynamicType = function(value){
	var type = typeof(value);
	if(type == "number")
	{
		this.writeByte(1);

		var isInt = ((value | 0) == value) || (((+value).toFixed(20)).replace(/^-?\d*\.?|0+$/g, '').length == 0);
		if (isInt)
		{
			if(value > 0x7FFFFFFF)
			{
				this.writeString("UInt32");
				this.writeUInt32(value);
				return;
			}
			else if(-255 <= value && value <= +255)
			{
				this.writeString("Byte");
				this.writeByte(value | 0);
				return;
			}
			else if (-32768 <= value && value <= +32768)
			{
				this.writeString("Int16");
				this.writeInt16(value | 0);
				return;
			}
			else if (-2147483648 <= value && value <= +2147483648)
			{
				this.writeString("Int32");
				this.writeInt32(value | 0);
				return;
			}
		}

		if(-3.40282347E+38 <= value && value <= 3.40282347E+38)
		{
			this.writeString("Single");
			this.writeSingle(value);
			return;
		}

		this.writeString("Double");
		this.writeDouble(value);
		return;
	}
	else if(type == "boolean")
	{
		this.writeByte(1);
		this.writeString("Boolean");
		this.writeBoolean(value);
		return;
	}
	else if(type == "string")
	{
		if (value.length == 20)
		{
			if (value.substring(0, 4) == '+64x')
			{
				this.writeByte(1);
				this.writeString("UInt64");
				this.writeUInt64(value);
				return;
			}
			else if(value.substring(0, 4) == '-64x')
			{
				this.writeByte(1);
				this.writeString("Int64");
				this.writeInt64(value);
				return;
			}

		}
		else
		{
			this.writeByte(1);
			this.writeString("String");
			this.writeString(value);
			return;
		}

		this.writeByte(0);
		return;
	}
	else if(type == "object" && value instanceof Date)
	{
		this.writeByte(1);
		this.writeString("DateTime");
		this.writeDateTime(value);
		return;
	}
	else
	{
		this.writeByte(0);
		return;
	}
}

spike.PacketWriter.prototype.writeArrayOfByte = function(value){
	var type = typeof(value);
	if(type == "object" && value instanceof ByteArray){
		this.writeInt32(value.getSize());
		this.buffer.writeBytes(value.data);
	}else{
		this.writeInt32(value.length);
		this.buffer.writeBytes(value);
	}
}

spike.PacketWriter.prototype.writeArrayOfUInt16 = function(value){
	var type = typeof(value);
	if(type == "object" && value instanceof Array){
		this.writeInt32(value.length);
		if(value.length == 0)
			return;
		for(var i=0; i<value.length; ++i){
			this.writeUInt16(value[i]);
		}
	}else{
		this.writeInt32(0);
	}
}

spike.PacketWriter.prototype.writeArrayOfInt16 = function(value){
	var type = typeof(value);
	if(type == "object" && value instanceof Array){
		this.writeInt32(value.length);
		if(value.length == 0)
			return;
		for(var i=0; i<value.length; ++i){
			this.writeInt16(value[i]);
		}
	}else{
		this.writeInt32(0);
	}
}

spike.PacketWriter.prototype.writeArrayOfInt32 = function(value){
	var type = typeof(value);
	if(type == "object" && value instanceof Array){
		this.writeInt32(value.length);
		if(value.length == 0)
			return;
		for(var i=0; i<value.length; ++i){
			this.writeInt32(value[i]);
		}
	}else{
		this.writeInt32(0);
	}
}

spike.PacketWriter.prototype.writeArrayOfUInt32 = function(value){
	var type = typeof(value);
	if(type == "object" && value instanceof Array){
		this.writeInt32(value.length);
		if(value.length == 0)
			return;
		for(var i=0; i<value.length; ++i){
			this.writeUInt32(value[i]);
		}
	}else{
		this.writeInt32(0);
	}
}

spike.PacketWriter.prototype.writeArrayOfInt64 = function(value){
	var type = typeof(value);
	if(type == "object" && value instanceof Array){
		this.writeInt32(value.length);
		if(value.length == 0)
			return;
		for(var i=0; i<value.length; ++i){
			this.writeInt64(value[i]);
		}
	}else{
		this.writeInt32(0);
	}
}

spike.PacketWriter.prototype.writeArrayOfUInt64 = function(value){
	var type = typeof(value);
	if(type == "object" && value instanceof Array){
		this.writeInt32(value.length);
		if(value.length == 0)
			return;
		for(var i=0; i<value.length; ++i){
			this.writeUInt64(value[i]);
		}
	}else{
		this.writeInt32(0);
	}
}

spike.PacketWriter.prototype.writeArrayOfDouble = function(value){
	var type = typeof(value);
	if(type == "object" && value instanceof Array){
		this.writeInt32(value.length);
		if(value.length == 0)
			return;
		for(var i=0; i<value.length; ++i){
			this.writeDouble(value[i]);
		}
	}else{
		this.writeInt32(0);
	}
}

spike.PacketWriter.prototype.writeArrayOfSingle = function(value){
	var type = typeof(value);
	if(type == "object" && value instanceof Array){
		this.writeInt32(value.length);
		if(value.length == 0)
			return;
		for(var i=0; i<value.length; ++i){
			this.writeSingle(value[i]);
		}
	}else{
		this.writeInt32(0);
	}
}

spike.PacketWriter.prototype.writeArrayOfDateTime = function(value){
	var type = typeof(value);
	if(type == "object" && value instanceof Array){
		this.writeInt32(value.length);
		if(value.length == 0)
			return;
		for(var i=0; i<value.length; ++i){
			this.writeDateTime(value[i]);
		}
	}else{
		this.writeInt32(0);
	}
}

spike.PacketWriter.prototype.writeArrayOfString = function(value){
	var type = typeof(value);
	if(type == "object" && value instanceof Array){
		this.writeInt32(value.length);
		if(value.length == 0)
			return;
		for(var i=0; i<value.length; ++i){
			this.writeString(value[i]);
		}
	}else{
		this.writeInt32(0);
	}
}

spike.PacketWriter.prototype.writeArrayOfBoolean = function(value){
	var type = typeof(value);
	if(type == "object" && value instanceof Array){
		this.writeInt32(value.length);
		if(value.length == 0)
			return;
		for(var i=0; i<value.length; ++i){
			this.writeBoolean(value[i]);
		}
	}else{
		this.writeInt32(0);
	}
}

spike.PacketWriter.prototype.writeArrayOfDynamicType = function(value){
	var type = typeof(value);
	if(type == "object" && value instanceof Array){
		this.writeInt32(value.length);
		if(value.length == 0)
			return;
		for(var i=0; i<value.length; ++i){
			this.writeDynamicType(value[i]);
		}
	}else{
		this.writeInt32(0);
	}
}

spike.PacketWriter.prototype.writeArray = function(value){
	var type = typeof(value);
	if(type == "object" && value instanceof Array){
		this.writeInt32(value.length);
		if(value.length == 0)
			return;
		for(var i=0; i<value.length; ++i){
			if(value[i].write != 'undefined'){
				value[i].write(this);
			}else{
				throw "Unable to write, the array contains unknown elements";
			}
		}
	}else{
		this.writeInt32(0);
	}
}


spike.PacketWriter.prototype.writeParameter = function(value)
{
    		this.writeString(value.key);
    		this.writeDynamicType(value.value);
    }

spike.PacketWriter.prototype.writeArrayOfParameter = function(value)
{
	if(Object.prototype.toString.call(value) !== '[object Array]')
		throw new Error("Attempted to write an invalid array.");

    this.writeInt32(value.length);
    for (var i = 0; i < value.length; ++i)
        this.writeParameter(value[i]);
}
  /* The packet reader which is used for reading binary buffer */
spike.PacketReader = function(byteArray){
    this.buffer = byteArray;
}

spike.PacketReader.prototype.decompress = function(){
	this.buffer = new spike.PacketCompressor().decompress(this.buffer, this.buffer.getSize());
	this.buffer.position = 0;
}

spike.PacketReader.prototype.readBoolean = function(){
	return this.buffer.readInt(8, false) == 1;
}

spike.PacketReader.prototype.readByte = function(){
    return this.buffer.readInt(8, false);
}

spike.PacketReader.prototype.readSByte = function(){
    return this.buffer.readInt(8, true);
}

spike.PacketReader.prototype.readInt16 = function(){
    return this.buffer.readInt(16, true);
}

spike.PacketReader.prototype.readInt32 = function(){
    return this.buffer.readInt(32, true);
}

spike.PacketReader.prototype.readInt64 = function(){
    return this.buffer.readInt(64, true);
}

spike.PacketReader.prototype.readUInt16 = function(){
    return this.buffer.readInt(16, false);
}

spike.PacketReader.prototype.readUInt32 = function(){
    return this.buffer.readInt(32, false);
}

spike.PacketReader.prototype.readUInt64 = function(){
    return this.buffer.readInt(64, false);
}

spike.PacketReader.prototype.readDateTime = function(){
	var year = this.readInt16();
	var month = this.readInt16() - 1;
	var date = this.readInt16();
	var hour = this.readInt16();
	var minute = this.readInt16();
	var second = this.readInt16();
	var millisecond = this.readInt16();
			
	return new Date(year,month,date,hour,minute,second,millisecond);
}

spike.PacketReader.prototype.readSingle = function(){
    return this.buffer.readFloat(23, 8);
}

spike.PacketReader.prototype.readDouble = function(){
    return this.buffer.readFloat(52, 11);
}

spike.PacketReader.prototype.readString = function(){
	var length = this.readInt32();
	if(length > 0){
		var s = this.buffer.readBytes(length);
		return spike.binarySupport
			? decodeURIComponent(escape(String.fromCharCode.apply(null, s)))
			: decodeURIComponent(escape(s));
	}
	else{
		return '';
	}
}

spike.PacketReader.prototype.readDynamicType = function(){
if(this.readByte()  == 1){
	var type = this.readString();
	switch (type){
		case 'Byte': return this.readByte();
		case 'Int16': return this.readInt16();
		case 'Int32': return this.readInt32();
		case 'Int64': return this.readInt64();
		case 'UInt16': return this.readUInt16();
		case 'UInt32': return this.readUInt32();
		case 'UInt64': return this.readUInt64();
		case 'Boolean': return this.readBoolean();
		case 'Single': return this.readSingle();
		case 'Double': return this.readDouble();
		case 'DateTime': return this.readDateTime();
		case 'String': return this.readString();
		default: return null;
	}
}
return null;
}

spike.PacketReader.prototype.readPacket = function(value){
	value.read(this);
	return value;
}

spike.PacketReader.prototype.readEntity = function(value){
	value.read(this);
	return value;
}

spike.PacketReader.prototype.readArrayOfByte = function(){
	var len = this.readInt32();
	var arr = new spike.ByteArray();
	arr.writeBytes(this.buffer.readBytes(len));
	arr.position = 0;
	return arr;
}

spike.PacketReader.prototype.readArrayOfEntity = function(className){
	var length = this.readInt32();
	var classCtor = 'new ' + className + '()';		
	var resultArray = new Array();
	if(length == 0){
		return resultArray;
	}
				
	for(var i = 0; i < length; ++i){
		var entityInstance = eval(classCtor);
		resultArray.push( this.readEntity(entityInstance) );	
	}
	return resultArray;
}

spike.PacketReader.prototype.readArrayOfUInt16 = function(){
	var length = this.readInt32();
	var resultArray = new Array();
		
	for(var i = 0; i < length; ++i)
		resultArray.push( this.readUInt16() );
			
	return resultArray;
}

spike.PacketReader.prototype.readArrayOfInt16 = function(){
	var length = this.readInt32();
	var resultArray = new Array();
		
	for(var i = 0; i < length; ++i)
		resultArray.push( this.readInt16() );
			
	return resultArray;
}

spike.PacketReader.prototype.readArrayOfUInt32 = function(){
	var length = this.readInt32();
	var resultArray = new Array();
		
	for(var i = 0; i < length; ++i)
		resultArray.push( this.readUInt32() );
			
	return resultArray;
}

spike.PacketReader.prototype.readArrayOfInt32 = function(){
	var length = this.readInt32();
	var resultArray = new Array();
		
	for(var i = 0; i < length; ++i)
		resultArray.push( this.readInt32() );
			
	return resultArray;
}

spike.PacketReader.prototype.readArrayOfUInt64 = function(){
	var length = this.readInt32();
	var resultArray = new Array();
		
	for(var i = 0; i < length; ++i)
		resultArray.push( this.readUInt64() );
			
	return resultArray;
}

spike.PacketReader.prototype.readArrayOfInt64 = function(){
	var length = this.readInt32();
	var resultArray = new Array();
		
	for(var i = 0; i < length; ++i)
		resultArray.push( this.readInt64() );
			
	return resultArray;
}

spike.PacketReader.prototype.readArrayOfSingle = function(){
	var length = this.readInt32();
	var resultArray = new Array();
		
	for(var i = 0; i < length; ++i)
		resultArray.push( this.readSingle() );
			
	return resultArray;
}

spike.PacketReader.prototype.readArrayOfDouble = function(){
	var length = this.readInt32();
	var resultArray = new Array();
		
	for(var i = 0; i < length; ++i)
		resultArray.push( this.readDouble() );
			
	return resultArray;
}

spike.PacketReader.prototype.readArrayOfBoolean = function(){
	var length = this.readInt32();
	var resultArray = new Array();
		
	for(var i = 0; i < length; ++i)
		resultArray.push( this.readBoolean() );
			
	return resultArray;
}

spike.PacketReader.prototype.readArrayOfDateTime = function(){
	var length = this.readInt32();
	var resultArray = new Array();
		
	for(var i = 0; i < length; ++i)
		resultArray.push( this.readDateTime() );
			
	return resultArray;
}

spike.PacketReader.prototype.readArrayOfString = function(){
	var length = this.readInt32();
	var resultArray = new Array();
		
	for(var i = 0; i < length; ++i)
		resultArray.push( this.readString() );
			
	return resultArray;
}

spike.PacketReader.prototype.readArrayOfDynamicType = function(){
	var length = this.readInt32();
	var resultArray = new Array();
		
	for(var i = 0; i < length; ++i)
		resultArray.push( this.readDynamicType() );
			
	return resultArray;
}


spike.PacketReader.prototype.readParameter = function(){
    var value = new Object();
		value.key = this.readString();	
		value.value = this.readDynamicType();	
		return value;
}

spike.PacketReader.prototype.readArrayOfParameter = function(){
	var length = this.readInt32();
    var value  = [];
    for (var i = 0; i < length; ++i)
        value[i] = this.readParameter();
    return value;
}
  !function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.eio=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){

module.exports =  _dereq_('./lib/');

},{"./lib/":2}],2:[function(_dereq_,module,exports){

module.exports = _dereq_('./socket');

/**
 * Exports parser
 *
 * @api public
 *
 */
module.exports.parser = _dereq_('engine.io-parser');

},{"./socket":3,"engine.io-parser":17}],3:[function(_dereq_,module,exports){
(function (global){
/**
 * Module dependencies.
 */

var transports = _dereq_('./transports');
var Emitter = _dereq_('component-emitter');
var debug = _dereq_('debug')('engine.io-client:socket');
var index = _dereq_('indexof');
var parser = _dereq_('engine.io-parser');
var parseuri = _dereq_('parseuri');
var parsejson = _dereq_('parsejson');
var parseqs = _dereq_('parseqs');

/**
 * Module exports.
 */

module.exports = Socket;

/**
 * Noop function.
 *
 * @api private
 */

function noop(){}

/**
 * Socket constructor.
 *
 * @param {String|Object} uri or options
 * @param {Object} options
 * @api public
 */

function Socket(uri, opts){
  if (!(this instanceof Socket)) return new Socket(uri, opts);

  opts = opts || {};

  if (uri && 'object' == typeof uri) {
    opts = uri;
    uri = null;
  }

  if (uri) {
    uri = parseuri(uri);
    opts.host = uri.host;
    opts.secure = uri.protocol == 'https' || uri.protocol == 'wss';
    opts.port = uri.port;
    if (uri.query) opts.query = uri.query;
  }

  this.secure = null != opts.secure ? opts.secure :
    (global.location && 'https:' == location.protocol);

  if (opts.host) {
    var pieces = opts.host.split(':');
    opts.hostname = pieces.shift();
    if (pieces.length) opts.port = pieces.pop();
  }

  this.agent = opts.agent || false;
  this.hostname = opts.hostname ||
    (global.location ? location.hostname : 'localhost');
  this.port = opts.port || (global.location && location.port ?
       location.port :
       (this.secure ? 443 : 80));
  this.query = opts.query || {};
  if ('string' == typeof this.query) this.query = parseqs.decode(this.query);
  this.upgrade = false !== opts.upgrade;
  this.path = (opts.path || '/engine.io').replace(/\/$/, '') + '/';
  this.forceJSONP = !!opts.forceJSONP;
  this.jsonp = false !== opts.jsonp;
  this.forceBase64 = !!opts.forceBase64;
  this.enablesXDR = !!opts.enablesXDR;
  this.timestampParam = opts.timestampParam || 't';
  this.timestampRequests = opts.timestampRequests;
  this.transports = opts.transports || ['polling', 'websocket'];
  this.readyState = '';
  this.writeBuffer = [];
  this.callbackBuffer = [];
  this.policyPort = opts.policyPort || 843;
  this.rememberUpgrade = opts.rememberUpgrade || false;
  this.open();
  this.binaryType = null;
  this.onlyBinaryUpgrades = opts.onlyBinaryUpgrades;
}

Socket.priorWebsocketSuccess = false;

/**
 * Mix in `Emitter`.
 */

Emitter(Socket.prototype);

/**
 * Protocol version.
 *
 * @api public
 */

Socket.protocol = parser.protocol; // this is an int

/**
 * Expose deps for legacy compatibility
 * and standalone browser access.
 */

Socket.Socket = Socket;
Socket.Transport = _dereq_('./transport');
Socket.transports = _dereq_('./transports');
Socket.parser = _dereq_('engine.io-parser');

/**
 * Creates transport of the given type.
 *
 * @param {String} transport name
 * @return {Transport}
 * @api private
 */

Socket.prototype.createTransport = function (name) {
  debug('creating transport "%s"', name);
  var query = clone(this.query);

  // append engine.io protocol identifier
  query.EIO = parser.protocol;

  // transport name
  query.transport = name;

  // session id if we already have one
  if (this.id) query.sid = this.id;

  var transport = new transports[name]({
    agent: this.agent,
    hostname: this.hostname,
    port: this.port,
    secure: this.secure,
    path: this.path,
    query: query,
    forceJSONP: this.forceJSONP,
    jsonp: this.jsonp,
    forceBase64: this.forceBase64,
    enablesXDR: this.enablesXDR,
    timestampRequests: this.timestampRequests,
    timestampParam: this.timestampParam,
    policyPort: this.policyPort,
    socket: this
  });

  return transport;
};

function clone (obj) {
  var o = {};
  for (var i in obj) {
    if (obj.hasOwnProperty(i)) {
      o[i] = obj[i];
    }
  }
  return o;
}

/**
 * Initializes transport to use and starts probe.
 *
 * @api private
 */
Socket.prototype.open = function () {
  var transport;
  if (this.rememberUpgrade && Socket.priorWebsocketSuccess && this.transports.indexOf('websocket') != -1) {
    transport = 'websocket';
  } else if (0 == this.transports.length) {
    // Emit error on next tick so it can be listened to
    var self = this;
    setTimeout(function() {
      self.emit('error', 'No transports available');
    }, 0);
    return;
  } else {
    transport = this.transports[0];
  }
  this.readyState = 'opening';

  // Retry with the next transport if the transport is disabled (jsonp: false)
  var transport;
  try {
    transport = this.createTransport(transport);
  } catch (e) {
    this.transports.shift();
    this.open();
    return;
  }

  transport.open();
  this.setTransport(transport);
};

/**
 * Sets the current transport. Disables the existing one (if any).
 *
 * @api private
 */

Socket.prototype.setTransport = function(transport){
  debug('setting transport %s', transport.name);
  var self = this;

  if (this.transport) {
    debug('clearing existing transport %s', this.transport.name);
    this.transport.removeAllListeners();
  }

  // set up transport
  this.transport = transport;

  // set up transport listeners
  transport
  .on('drain', function(){
    self.onDrain();
  })
  .on('packet', function(packet){
    self.onPacket(packet);
  })
  .on('error', function(e){
    self.onError(e);
  })
  .on('close', function(){
    self.onClose('transport close');
  });
};

/**
 * Probes a transport.
 *
 * @param {String} transport name
 * @api private
 */

Socket.prototype.probe = function (name) {
  debug('probing transport "%s"', name);
  var transport = this.createTransport(name, { probe: 1 })
    , failed = false
    , self = this;

  Socket.priorWebsocketSuccess = false;

  function onTransportOpen(){
    if (self.onlyBinaryUpgrades) {
      var upgradeLosesBinary = !this.supportsBinary && self.transport.supportsBinary;
      failed = failed || upgradeLosesBinary;
    }
    if (failed) return;

    debug('probe transport "%s" opened', name);
    transport.send([{ type: 'ping', data: 'probe' }]);
    transport.once('packet', function (msg) {
      if (failed) return;
      if ('pong' == msg.type && 'probe' == msg.data) {
        debug('probe transport "%s" pong', name);
        self.upgrading = true;
        self.emit('upgrading', transport);
        if (!transport) return;
        Socket.priorWebsocketSuccess = 'websocket' == transport.name;

        debug('pausing current transport "%s"', self.transport.name);
        self.transport.pause(function () {
          if (failed) return;
          if ('closed' == self.readyState) return;
          debug('changing transport and sending upgrade packet');

          cleanup();

          self.setTransport(transport);
          transport.send([{ type: 'upgrade' }]);
          self.emit('upgrade', transport);
          transport = null;
          self.upgrading = false;
          self.flush();
        });
      } else {
        debug('probe transport "%s" failed', name);
        var err = new Error('probe error');
        err.transport = transport.name;
        self.emit('upgradeError', err);
      }
    });
  }

  function freezeTransport() {
    if (failed) return;

    // Any callback called by transport should be ignored since now
    failed = true;

    cleanup();

    transport.close();
    transport = null;
  }

  //Handle any error that happens while probing
  function onerror(err) {
    var error = new Error('probe error: ' + err);
    error.transport = transport.name;

    freezeTransport();

    debug('probe transport "%s" failed because of error: %s', name, err);

    self.emit('upgradeError', error);
  }

  function onTransportClose(){
    onerror("transport closed");
  }

  //When the socket is closed while we're probing
  function onclose(){
    onerror("socket closed");
  }

  //When the socket is upgraded while we're probing
  function onupgrade(to){
    if (transport && to.name != transport.name) {
      debug('"%s" works - aborting "%s"', to.name, transport.name);
      freezeTransport();
    }
  }

  //Remove all listeners on the transport and on self
  function cleanup(){
    transport.removeListener('open', onTransportOpen);
    transport.removeListener('error', onerror);
    transport.removeListener('close', onTransportClose);
    self.removeListener('close', onclose);
    self.removeListener('upgrading', onupgrade);
  }

  transport.once('open', onTransportOpen);
  transport.once('error', onerror);
  transport.once('close', onTransportClose);

  this.once('close', onclose);
  this.once('upgrading', onupgrade);

  transport.open();

};

/**
 * Called when connection is deemed open.
 *
 * @api public
 */

Socket.prototype.onOpen = function () {
  debug('socket open');
  this.readyState = 'open';
  Socket.priorWebsocketSuccess = 'websocket' == this.transport.name;
  this.emit('open');
  this.flush();

  // we check for `readyState` in case an `open`
  // listener already closed the socket
  if ('open' == this.readyState && this.upgrade && this.transport.pause) {
    debug('starting upgrade probes');
    for (var i = 0, l = this.upgrades.length; i < l; i++) {
      this.probe(this.upgrades[i]);
    }
  }
};

/**
 * Handles a packet.
 *
 * @api private
 */

Socket.prototype.onPacket = function (packet) {
  if ('opening' == this.readyState || 'open' == this.readyState) {
    //debug('socket receive: type "%s", data "%s"', packet.type, packet.data);

    this.emit('packet', packet);

    // Socket is live - any packet counts
    this.emit('heartbeat');

    switch (packet.type) {
      case 'open':
        this.onHandshake(parsejson(packet.data));
        break;

      case 'pong':
        this.setPing();
        break;

      case 'error':
        var err = new Error('server error');
        err.code = packet.data;
        this.emit('error', err);
        break;

      case 'message':
        this.emit('data', packet.data);
        this.emit('message', packet.data);
        break;
    }
  } else {
    debug('packet received with socket readyState "%s"', this.readyState);
  }
};

/**
 * Called upon handshake completion.
 *
 * @param {Object} handshake obj
 * @api private
 */

Socket.prototype.onHandshake = function (data) {
  this.emit('handshake', data);
  this.id = data.sid;
  this.transport.query.sid = data.sid;
  this.upgrades = this.filterUpgrades(data.upgrades);
  this.pingInterval = data.pingInterval;
  this.pingTimeout = data.pingTimeout;
  this.onOpen();
  // In case open handler closes socket
  if  ('closed' == this.readyState) return;
  this.setPing();

  // Prolong liveness of socket on heartbeat
  this.removeListener('heartbeat', this.onHeartbeat);
  this.on('heartbeat', this.onHeartbeat);
};

/**
 * Resets ping timeout.
 *
 * @api private
 */

Socket.prototype.onHeartbeat = function (timeout) {
  clearTimeout(this.pingTimeoutTimer);
  var self = this;
  self.pingTimeoutTimer = setTimeout(function () {
    if ('closed' == self.readyState) return;
    self.onClose('ping timeout');
  }, timeout || (self.pingInterval + self.pingTimeout));
};

/**
 * Pings server every `this.pingInterval` and expects response
 * within `this.pingTimeout` or closes connection.
 *
 * @api private
 */

Socket.prototype.setPing = function () {
  var self = this;
  clearTimeout(self.pingIntervalTimer);
  self.pingIntervalTimer = setTimeout(function () {
    debug('writing ping packet - expecting pong within %sms', self.pingTimeout);
    self.ping();
    self.onHeartbeat(self.pingTimeout);
  }, self.pingInterval);
};

/**
* Sends a ping packet.
*
* @api public
*/

Socket.prototype.ping = function () {
  this.sendPacket('ping');
};

/**
 * Called on `drain` event
 *
 * @api private
 */

Socket.prototype.onDrain = function() {
  for (var i = 0; i < this.prevBufferLen; i++) {
    if (this.callbackBuffer[i]) {
      this.callbackBuffer[i]();
    }
  }

  this.writeBuffer.splice(0, this.prevBufferLen);
  this.callbackBuffer.splice(0, this.prevBufferLen);

  // setting prevBufferLen = 0 is very important
  // for example, when upgrading, upgrade packet is sent over,
  // and a nonzero prevBufferLen could cause problems on `drain`
  this.prevBufferLen = 0;

  if (this.writeBuffer.length == 0) {
    this.emit('drain');
  } else {
    this.flush();
  }
};

/**
 * Flush write buffers.
 *
 * @api private
 */

Socket.prototype.flush = function () {
  if ('closed' != this.readyState && this.transport.writable &&
    !this.upgrading && this.writeBuffer.length) {
    //debug('flushing %d packets in socket', this.writeBuffer.length);
    this.transport.send(this.writeBuffer);
    // keep track of current length of writeBuffer
    // splice writeBuffer and callbackBuffer on `drain`
    this.prevBufferLen = this.writeBuffer.length;
    this.emit('flush');
  }
};

/**
 * Sends a message.
 *
 * @param {String} message.
 * @param {Function} callback function.
 * @return {Socket} for chaining.
 * @api public
 */

Socket.prototype.write =
Socket.prototype.send = function (msg, fn) {
  this.sendPacket('message', msg, fn);
  return this;
};

/**
 * Sends a packet.
 *
 * @param {String} packet type.
 * @param {String} data.
 * @param {Function} callback function.
 * @api private
 */

Socket.prototype.sendPacket = function (type, data, fn) {
  if ('closing' == this.readyState || 'closed' == this.readyState) {
    return;
  }

  var packet = { type: type, data: data };
  this.emit('packetCreate', packet);
  this.writeBuffer.push(packet);
  this.callbackBuffer.push(fn);
  this.flush();
};

/**
 * Closes the connection.
 *
 * @api private
 */

Socket.prototype.close = function () {
  if ('opening' == this.readyState || 'open' == this.readyState) {
    this.readyState = 'closing';

    var self = this;

    function close() {
      self.onClose('forced close');
      debug('socket closing - telling transport to close');
      self.transport.close();
    }

    function cleanupAndClose() {
      self.removeListener('upgrade', cleanupAndClose);
      self.removeListener('upgradeError', cleanupAndClose);
      close();
    }

    function waitForUpgrade() {
      // wait for upgrade to finish since we can't send packets while pausing a transport
      self.once('upgrade', cleanupAndClose);
      self.once('upgradeError', cleanupAndClose);
    }

    if (this.writeBuffer.length) {
      this.once('drain', function() {
        if (this.upgrading) {
          waitForUpgrade();
        } else {
          close();
        }
      });
    } else if (this.upgrading) {
      waitForUpgrade();
    } else {
      close();
    }
  }

  return this;
};

/**
 * Called upon transport error
 *
 * @api private
 */

Socket.prototype.onError = function (err) {
  debug('socket error %j', err);
  Socket.priorWebsocketSuccess = false;
  this.emit('error', err);
  this.onClose('transport error', err);
};

/**
 * Called upon transport close.
 *
 * @api private
 */

Socket.prototype.onClose = function (reason, desc) {
  if ('opening' == this.readyState || 'open' == this.readyState || 'closing' == this.readyState) {
    debug('socket close with reason: "%s"', reason);
    var self = this;

    // clear timers
    clearTimeout(this.pingIntervalTimer);
    clearTimeout(this.pingTimeoutTimer);

    // clean buffers in next tick, so developers can still
    // grab the buffers on `close` event
    setTimeout(function() {
      self.writeBuffer = [];
      self.callbackBuffer = [];
      self.prevBufferLen = 0;
    }, 0);

    // stop event from firing again for transport
    this.transport.removeAllListeners('close');

    // ensure transport won't stay open
    this.transport.close();

    // ignore further transport communication
    this.transport.removeAllListeners();

    // set ready state
    this.readyState = 'closed';

    // clear session id
    this.id = null;

    // emit close event
    this.emit('close', reason, desc);
  }
};

/**
 * Filters upgrades, returning only those matching client transports.
 *
 * @param {Array} server upgrades
 * @api private
 *
 */

Socket.prototype.filterUpgrades = function (upgrades) {
  var filteredUpgrades = [];
  for (var i = 0, j = upgrades.length; i<j; i++) {
    if (~index(this.transports, upgrades[i])) filteredUpgrades.push(upgrades[i]);
  }
  return filteredUpgrades;
};

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./transport":4,"./transports":5,"component-emitter":12,"debug":14,"engine.io-parser":17,"indexof":25,"parsejson":26,"parseqs":27,"parseuri":28}],4:[function(_dereq_,module,exports){
/**
 * Module dependencies.
 */

var parser = _dereq_('engine.io-parser');
var Emitter = _dereq_('component-emitter');


/**
 * Module exports.
 */

module.exports = Transport;

/**
 * Transport abstract constructor.
 *
 * @param {Object} options.
 * @api private
 */

function Transport (opts) {
  this.path = opts.path;
  this.hostname = opts.hostname;
  this.port = opts.port;
  this.secure = opts.secure;
  this.query = opts.query;
  this.timestampParam = opts.timestampParam;
  this.timestampRequests = opts.timestampRequests;
  this.readyState = '';
  this.agent = opts.agent || false;
  this.socket = opts.socket;
  this.enablesXDR = opts.enablesXDR;
}

/**
 * Mix in `Emitter`.
 */

Emitter(Transport.prototype);

/**
 * A counter used to prevent collisions in the timestamps used
 * for cache busting.
 */

Transport.timestamps = 0;

/**
 * Emits an error.
 *
 * @param {String} str
 * @return {Transport} for chaining
 * @api public
 */

Transport.prototype.onError = function (msg, desc) {
  var err = new Error(msg);
  err.type = 'TransportError';
  err.description = desc;
  this.emit('error', err);
  return this;
};

/**
 * Opens the transport.
 *
 * @api public
 */

Transport.prototype.open = function () {
  if ('closed' == this.readyState || '' == this.readyState) {
    this.readyState = 'opening';
    this.doOpen();
  }

  return this;
};

/**
 * Closes the transport.
 *
 * @api private
 */

Transport.prototype.close = function () {
  if ('opening' == this.readyState || 'open' == this.readyState) {
    this.doClose();
    this.onClose();
  }

  return this;
};

/**
 * Sends multiple packets.
 *
 * @param {Array} packets
 * @api private
 */

Transport.prototype.send = function(packets){
  if ('open' == this.readyState) {
    this.write(packets);
  } else {
    throw new Error('Transport not open');
  }
};

/**
 * Called upon open
 *
 * @api private
 */

Transport.prototype.onOpen = function () {
  this.readyState = 'open';
  this.writable = true;
  this.emit('open');
};

/**
 * Called with data.
 *
 * @param {String} data
 * @api private
 */

Transport.prototype.onData = function(data){
  var packet = parser.decodePacket(data, this.socket.binaryType);
  this.onPacket(packet);
};

/**
 * Called with a decoded packet.
 */

Transport.prototype.onPacket = function (packet) {
  this.emit('packet', packet);
};

/**
 * Called upon close.
 *
 * @api private
 */

Transport.prototype.onClose = function () {
  this.readyState = 'closed';
  this.emit('close');
};

},{"component-emitter":12,"engine.io-parser":17}],5:[function(_dereq_,module,exports){
(function (global){
/**
 * Module dependencies
 */

var XMLHttpRequest = _dereq_('xmlhttprequest');
var XHR = _dereq_('./polling-xhr');
var JSONP = _dereq_('./polling-jsonp');
var websocket = _dereq_('./websocket');

/**
 * Export transports.
 */

exports.polling = polling;
exports.websocket = websocket;

/**
 * Polling transport polymorphic constructor.
 * Decides on xhr vs jsonp based on feature detection.
 *
 * @api private
 */

function polling(opts){
  var xhr;
  var xd = false;
  var xs = false;
  var jsonp = false !== opts.jsonp;

  if (global.location) {
    var isSSL = 'https:' == location.protocol;
    var port = location.port;

    // some user agents have empty `location.port`
    if (!port) {
      port = isSSL ? 443 : 80;
    }

    xd = opts.hostname != location.hostname || port != opts.port;
    xs = opts.secure != isSSL;
  }

  opts.xdomain = xd;
  opts.xscheme = xs;
  xhr = new XMLHttpRequest(opts);

  if ('open' in xhr && !opts.forceJSONP) {
    return new XHR(opts);
  } else {
    if (!jsonp) throw new Error('JSONP disabled');
    return new JSONP(opts);
  }
}

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./polling-jsonp":6,"./polling-xhr":7,"./websocket":9,"xmlhttprequest":10}],6:[function(_dereq_,module,exports){
(function (global){

/**
 * Module requirements.
 */

var Polling = _dereq_('./polling');
var inherit = _dereq_('component-inherit');

/**
 * Module exports.
 */

module.exports = JSONPPolling;

/**
 * Cached regular expressions.
 */

var rNewline = /\n/g;
var rEscapedNewline = /\\n/g;

/**
 * Global JSONP callbacks.
 */

var callbacks;

/**
 * Callbacks count.
 */

var index = 0;

/**
 * Noop.
 */

function empty () { }

/**
 * JSONP Polling constructor.
 *
 * @param {Object} opts.
 * @api public
 */

function JSONPPolling (opts) {
  Polling.call(this, opts);

  this.query = this.query || {};

  // define global callbacks array if not present
  // we do this here (lazily) to avoid unneeded global pollution
  if (!callbacks) {
    // we need to consider multiple engines in the same page
    if (!global.___eio) global.___eio = [];
    callbacks = global.___eio;
  }

  // callback identifier
  this.index = callbacks.length;

  // add callback to jsonp global
  var self = this;
  callbacks.push(function (msg) {
    self.onData(msg);
  });

  // append to query string
  this.query.j = this.index;

  // prevent spurious errors from being emitted when the window is unloaded
  if (global.document && global.addEventListener) {
    global.addEventListener('beforeunload', function () {
      if (self.script) self.script.onerror = empty;
    }, false);
  }
}

/**
 * Inherits from Polling.
 */

inherit(JSONPPolling, Polling);

/*
 * JSONP only supports binary as base64 encoded strings
 */

JSONPPolling.prototype.supportsBinary = false;

/**
 * Closes the socket.
 *
 * @api private
 */

JSONPPolling.prototype.doClose = function () {
  if (this.script) {
    this.script.parentNode.removeChild(this.script);
    this.script = null;
  }

  if (this.form) {
    this.form.parentNode.removeChild(this.form);
    this.form = null;
    this.iframe = null;
  }

  Polling.prototype.doClose.call(this);
};

/**
 * Starts a poll cycle.
 *
 * @api private
 */

JSONPPolling.prototype.doPoll = function () {
  var self = this;
  var script = document.createElement('script');

  if (this.script) {
    this.script.parentNode.removeChild(this.script);
    this.script = null;
  }

  script.async = true;
  script.src = this.uri();
  script.onerror = function(e){
    self.onError('jsonp poll error',e);
  };

  var insertAt = document.getElementsByTagName('script')[0];
  insertAt.parentNode.insertBefore(script, insertAt);
  this.script = script;

  var isUAgecko = 'undefined' != typeof navigator && /gecko/i.test(navigator.userAgent);
  
  if (isUAgecko) {
    setTimeout(function () {
      var iframe = document.createElement('iframe');
      document.body.appendChild(iframe);
      document.body.removeChild(iframe);
    }, 100);
  }
};

/**
 * Writes with a hidden iframe.
 *
 * @param {String} data to send
 * @param {Function} called upon flush.
 * @api private
 */

JSONPPolling.prototype.doWrite = function (data, fn) {
  var self = this;

  if (!this.form) {
    var form = document.createElement('form');
    var area = document.createElement('textarea');
    var id = this.iframeId = 'eio_iframe_' + this.index;
    var iframe;

    form.className = 'socketio';
    form.style.position = 'absolute';
    form.style.top = '-1000px';
    form.style.left = '-1000px';
    form.target = id;
    form.method = 'POST';
    form.setAttribute('accept-charset', 'utf-8');
    area.name = 'd';
    form.appendChild(area);
    document.body.appendChild(form);

    this.form = form;
    this.area = area;
  }

  this.form.action = this.uri();

  function complete () {
    initIframe();
    fn();
  }

  function initIframe () {
    if (self.iframe) {
      try {
        self.form.removeChild(self.iframe);
      } catch (e) {
        self.onError('jsonp polling iframe removal error', e);
      }
    }

    try {
      // ie6 dynamic iframes with target="" support (thanks Chris Lambacher)
      var html = '<iframe src="javascript:0" name="'+ self.iframeId +'">';
      iframe = document.createElement(html);
    } catch (e) {
      iframe = document.createElement('iframe');
      iframe.name = self.iframeId;
      iframe.src = 'javascript:0';
    }

    iframe.id = self.iframeId;

    self.form.appendChild(iframe);
    self.iframe = iframe;
  }

  initIframe();

  // escape \n to prevent it from being converted into \r\n by some UAs
  // double escaping is required for escaped new lines because unescaping of new lines can be done safely on server-side
  data = data.replace(rEscapedNewline, '\\\n');
  this.area.value = data.replace(rNewline, '\\n');

  try {
    this.form.submit();
  } catch(e) {}

  if (this.iframe.attachEvent) {
    this.iframe.onreadystatechange = function(){
      if (self.iframe.readyState == 'complete') {
        complete();
      }
    };
  } else {
    this.iframe.onload = complete;
  }
};

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./polling":8,"component-inherit":13}],7:[function(_dereq_,module,exports){
(function (global){
/**
 * Module requirements.
 */

var XMLHttpRequest = _dereq_('xmlhttprequest');
var Polling = _dereq_('./polling');
var Emitter = _dereq_('component-emitter');
var inherit = _dereq_('component-inherit');
var debug = _dereq_('debug')('engine.io-client:polling-xhr');

if(typeof spike === 'undefined')
	spike = new Object();
spike.Emitter = Emitter;
spike.debug = _dereq_('debug')('spike');


/**
 * Module exports.
 */

module.exports = XHR;
module.exports.Request = Request;

/**
 * Empty function
 */

function empty(){}

/**
 * XHR Polling constructor.
 *
 * @param {Object} opts
 * @api public
 */

function XHR(opts){
  Polling.call(this, opts);

  if (global.location) {
    var isSSL = 'https:' == location.protocol;
    var port = location.port;

    // some user agents have empty `location.port`
    if (!port) {
      port = isSSL ? 443 : 80;
    }

    this.xd = opts.hostname != global.location.hostname ||
      port != opts.port;
    this.xs = opts.secure != isSSL;
  }
}

/**
 * Inherits from Polling.
 */

inherit(XHR, Polling);

/**
 * XHR supports binary
 */

XHR.prototype.supportsBinary = true;

/**
 * Creates a request.
 *
 * @param {String} method
 * @api private
 */

XHR.prototype.request = function(opts){
  opts = opts || {};
  opts.uri = this.uri();
  opts.xd = this.xd;
  opts.xs = this.xs;
  opts.agent = this.agent || false;
  opts.supportsBinary = this.supportsBinary;
  opts.enablesXDR = this.enablesXDR;
  return new Request(opts);
};

/**
 * Sends data.
 *
 * @param {String} data to send.
 * @param {Function} called upon flush.
 * @api private
 */

XHR.prototype.doWrite = function(data, fn){
  var isBinary = typeof data !== 'string' && data !== undefined;
  var req = this.request({ method: 'POST', data: data, isBinary: isBinary });
  var self = this;
  req.on('success', fn);
  req.on('error', function(err){
    self.onError('xhr post error', err);
  });
  this.sendXhr = req;
};

/**
 * Starts a poll cycle.
 *
 * @api private
 */

XHR.prototype.doPoll = function(){
  debug('xhr poll');
  var req = this.request();
  var self = this;
  req.on('data', function(data){
    self.onData(data);
  });
  req.on('error', function(err){
    self.onError('xhr poll error', err);
  });
  this.pollXhr = req;
};

/**
 * Request constructor
 *
 * @param {Object} options
 * @api public
 */

function Request(opts){
  this.method = opts.method || 'GET';
  this.uri = opts.uri;
  this.xd = !!opts.xd;
  this.xs = !!opts.xs;
  this.async = false !== opts.async;
  this.data = undefined != opts.data ? opts.data : null;
  this.agent = opts.agent;
  this.isBinary = opts.isBinary;
  this.supportsBinary = opts.supportsBinary;
  this.enablesXDR = opts.enablesXDR;
  this.create();
}

/**
 * Mix in `Emitter`.
 */

Emitter(Request.prototype);

/**
 * Creates the XHR object and sends the request.
 *
 * @api private
 */

Request.prototype.create = function(){
  var xhr = this.xhr = new XMLHttpRequest({ agent: this.agent, xdomain: this.xd, xscheme: this.xs, enablesXDR: this.enablesXDR });
  var self = this;

  try {
    debug('xhr open %s: %s', this.method, this.uri);
    xhr.open(this.method, this.uri, this.async);
    if (this.supportsBinary) {
      // This has to be done after open because Firefox is stupid
      // http://stackoverflow.com/questions/13216903/get-binary-data-with-xmlhttprequest-in-a-firefox-extension
      xhr.responseType = 'arraybuffer';
    }

    if ('POST' == this.method) {
      try {
        if (this.isBinary) {
          xhr.setRequestHeader('Content-type', 'application/octet-stream');
        } else {
          xhr.setRequestHeader('Content-type', 'text/plain;charset=UTF-8');
        }
      } catch (e) {}
    }

    // ie6 check
    if ('withCredentials' in xhr) {
      xhr.withCredentials = true;
    }

    if (this.hasXDR()) {
      xhr.onload = function(){
        self.onLoad();
      };
      xhr.onerror = function(){
        self.onError(xhr.responseText);
      };
    } else {
      xhr.onreadystatechange = function(){
        if (4 != xhr.readyState) return;
        if (200 == xhr.status || 1223 == xhr.status) {
          self.onLoad();
        } else {
          // make sure the `error` event handler that's user-set
          // does not throw in the same tick and gets caught here
          setTimeout(function(){
            self.onError(xhr.status);
          }, 0);
        }
      };
    }

    debug('xhr data %s', this.data);
    xhr.send(this.data);
  } catch (e) {
    // Need to defer since .create() is called directly fhrom the constructor
    // and thus the 'error' event can only be only bound *after* this exception
    // occurs.  Therefore, also, we cannot throw here at all.
    setTimeout(function() {
      self.onError(e);
    }, 0);
    return;
  }

  if (global.document) {
    this.index = Request.requestsCount++;
    Request.requests[this.index] = this;
  }
};

/**
 * Called upon successful response.
 *
 * @api private
 */

Request.prototype.onSuccess = function(){
  this.emit('success');
  this.cleanup();
};

/**
 * Called if we have data.
 *
 * @api private
 */

Request.prototype.onData = function(data){
  this.emit('data', data);
  this.onSuccess();
};

/**
 * Called upon error.
 *
 * @api private
 */

Request.prototype.onError = function(err){
  this.emit('error', err);
  this.cleanup();
};

/**
 * Cleans up house.
 *
 * @api private
 */

Request.prototype.cleanup = function(){
  if ('undefined' == typeof this.xhr || null === this.xhr) {
    return;
  }
  // xmlhttprequest
  if (this.hasXDR()) {
    this.xhr.onload = this.xhr.onerror = empty;
  } else {
    this.xhr.onreadystatechange = empty;
  }

  try {
    this.xhr.abort();
  } catch(e) {}

  if (global.document) {
    delete Request.requests[this.index];
  }

  this.xhr = null;
};

/**
 * Called upon load.
 *
 * @api private
 */

Request.prototype.onLoad = function(){
  var data;
  try {
    var contentType;
    try {
      contentType = this.xhr.getResponseHeader('Content-Type').split(';')[0];
    } catch (e) {}
    if (contentType === 'application/octet-stream') {
      data = this.xhr.response;
    } else {
      if (!this.supportsBinary) {
        data = this.xhr.responseText;
      } else {
        data = 'ok';
      }
    }
  } catch (e) {
    this.onError(e);
  }
  if (null != data) {
    this.onData(data);
  }
};

/**
 * Check if it has XDomainRequest.
 *
 * @api private
 */

Request.prototype.hasXDR = function(){
  return 'undefined' !== typeof global.XDomainRequest && !this.xs && this.enablesXDR;
};

/**
 * Aborts the request.
 *
 * @api public
 */

Request.prototype.abort = function(){
  this.cleanup();
};

/**
 * Aborts pending requests when unloading the window. This is needed to prevent
 * memory leaks (e.g. when using IE) and to ensure that no spurious error is
 * emitted.
 */

if (global.document) {
  Request.requestsCount = 0;
  Request.requests = {};
  if (global.attachEvent) {
    global.attachEvent('onunload', unloadHandler);
  } else if (global.addEventListener) {
    global.addEventListener('beforeunload', unloadHandler, false);
  }
}

function unloadHandler() {
  for (var i in Request.requests) {
    if (Request.requests.hasOwnProperty(i)) {
      Request.requests[i].abort();
    }
  }
}

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./polling":8,"component-emitter":12,"component-inherit":13,"debug":14,"xmlhttprequest":10}],8:[function(_dereq_,module,exports){
/**
 * Module dependencies.
 */

var Transport = _dereq_('../transport');
var parseqs = _dereq_('parseqs');
var parser = _dereq_('engine.io-parser');
var inherit = _dereq_('component-inherit');
var debug = _dereq_('debug')('engine.io-client:polling');

/**
 * Module exports.
 */

module.exports = Polling;

/**
 * Is XHR2 supported?
 */

var hasXHR2 = (function() {
  var XMLHttpRequest = _dereq_('xmlhttprequest');
  var xhr = new XMLHttpRequest({ xdomain: false });
  return null != xhr.responseType;
})();

/**
 * Polling interface.
 *
 * @param {Object} opts
 * @api private
 */

function Polling(opts){
  var forceBase64 = (opts && opts.forceBase64);
  if (!hasXHR2 || forceBase64) {
    this.supportsBinary = false;
  }
  Transport.call(this, opts);
}

/**
 * Inherits from Transport.
 */

inherit(Polling, Transport);

/**
 * Transport name.
 */

Polling.prototype.name = 'polling';

/**
 * Opens the socket (triggers polling). We write a PING message to determine
 * when the transport is open.
 *
 * @api private
 */

Polling.prototype.doOpen = function(){
  this.poll();
};

/**
 * Pauses polling.
 *
 * @param {Function} callback upon buffers are flushed and transport is paused
 * @api private
 */

Polling.prototype.pause = function(onPause){
  var pending = 0;
  var self = this;

  this.readyState = 'pausing';

  function pause(){
    debug('paused');
    self.readyState = 'paused';
    onPause();
  }

  if (this.polling || !this.writable) {
    var total = 0;

    if (this.polling) {
      debug('we are currently polling - waiting to pause');
      total++;
      this.once('pollComplete', function(){
        debug('pre-pause polling complete');
        --total || pause();
      });
    }

    if (!this.writable) {
      debug('we are currently writing - waiting to pause');
      total++;
      this.once('drain', function(){
        debug('pre-pause writing complete');
        --total || pause();
      });
    }
  } else {
    pause();
  }
};

/**
 * Starts polling cycle.
 *
 * @api public
 */

Polling.prototype.poll = function(){
  debug('polling');
  this.polling = true;
  this.doPoll();
  this.emit('poll');
};

/**
 * Overloads onData to detect payloads.
 *
 * @api private
 */

Polling.prototype.onData = function(data){
  var self = this;
  debug('polling got data %s', data);
  var callback = function(packet, index, total) {
    // if its the first message we consider the transport open
    if ('opening' == self.readyState) {
      self.onOpen();
    }

    // if its a close packet, we close the ongoing requests
    if ('close' == packet.type) {
      self.onClose();
      return false;
    }

    // otherwise bypass onData and handle the message
    self.onPacket(packet);
  };

  // decode payload
  parser.decodePayload(data, this.socket.binaryType, callback);

  // if an event did not trigger closing
  if ('closed' != this.readyState) {
    // if we got data we're not polling
    this.polling = false;
    this.emit('pollComplete');

    if ('open' == this.readyState) {
      this.poll();
    } else {
      debug('ignoring poll - transport state "%s"', this.readyState);
    }
  }
};

/**
 * For polling, send a close packet.
 *
 * @api private
 */

Polling.prototype.doClose = function(){
  var self = this;

  function close(){
    debug('writing close packet');
    self.write([{ type: 'close' }]);
  }

  if ('open' == this.readyState) {
    debug('transport open - closing');
    close();
  } else {
    // in case we're trying to close while
    // handshaking is in progress (GH-164)
    debug('transport not open - deferring close');
    this.once('open', close);
  }
};

/**
 * Writes a packets payload.
 *
 * @param {Array} data packets
 * @param {Function} drain callback
 * @api private
 */

Polling.prototype.write = function(packets){
  var self = this;
  this.writable = false;
  var callbackfn = function() {
    self.writable = true;
    self.emit('drain');
  };

  var self = this;
  parser.encodePayload(packets, this.supportsBinary, function(data) {
    self.doWrite(data, callbackfn);
  });
};

/**
 * Generates uri for connection.
 *
 * @api private
 */

Polling.prototype.uri = function(){
  var query = this.query || {};
  var schema = this.secure ? 'https' : 'http';
  var port = '';

  // cache busting is forced
  if (false !== this.timestampRequests) {
    query[this.timestampParam] = +new Date + '-' + Transport.timestamps++;
  }

  if (!this.supportsBinary && !query.sid) {
    query.b64 = 1;
  }

  query = parseqs.encode(query);

  // avoid port if default for schema
  if (this.port && (('https' == schema && this.port != 443) ||
     ('http' == schema && this.port != 80))) {
    port = ':' + this.port;
  }

  // prepend ? to query
  if (query.length) {
    query = '?' + query;
  }

  return schema + '://' + this.hostname + port + this.path + query;
};

},{"../transport":4,"component-inherit":13,"debug":14,"engine.io-parser":17,"parseqs":27,"xmlhttprequest":10}],9:[function(_dereq_,module,exports){
/**
 * Module dependencies.
 */

var Transport = _dereq_('../transport');
var parser = _dereq_('engine.io-parser');
var parseqs = _dereq_('parseqs');
var inherit = _dereq_('component-inherit');
var debug = _dereq_('debug')('engine.io-client:websocket');

/**
 * `ws` exposes a WebSocket-compatible interface in
 * Node, or the `WebSocket` or `MozWebSocket` globals
 * in the browser.
 */

var WebSocket = _dereq_('ws');

/**
 * Module exports.
 */

module.exports = WS;

/**
 * WebSocket transport constructor.
 *
 * @api {Object} connection options
 * @api public
 */

function WS(opts){
  var forceBase64 = (opts && opts.forceBase64);
  if (forceBase64) {
    this.supportsBinary = false;
  }
  Transport.call(this, opts);
}

/**
 * Inherits from Transport.
 */

inherit(WS, Transport);

/**
 * Transport name.
 *
 * @api public
 */

WS.prototype.name = 'websocket';

/*
 * WebSockets support binary
 */

WS.prototype.supportsBinary = true;

/**
 * Opens socket.
 *
 * @api private
 */

WS.prototype.doOpen = function(){
  if (!this.check()) {
    // let probe timeout
    return;
  }

  var self = this;
  var uri = this.uri();
  var protocols = void(0);
  var opts = { agent: this.agent };

  this.ws = new WebSocket(uri, protocols, opts);

  if (this.ws.binaryType === undefined) {
    this.supportsBinary = false;
  }

  this.ws.binaryType = 'arraybuffer';
  this.addEventListeners();
};

/**
 * Adds event listeners to the socket
 *
 * @api private
 */

WS.prototype.addEventListeners = function(){
  var self = this;

  this.ws.onopen = function(){
    self.onOpen();
  };
  this.ws.onclose = function(){
    self.onClose();
  };
  this.ws.onmessage = function(ev){
    self.onData(ev.data);
  };
  this.ws.onerror = function(e){
    self.onError('websocket error', e);
  };
};

/**
 * Override `onData` to use a timer on iOS.
 * See: https://gist.github.com/mloughran/2052006
 *
 * @api private
 */

if ('undefined' != typeof navigator
  && /iPad|iPhone|iPod/i.test(navigator.userAgent)) {
  WS.prototype.onData = function(data){
    var self = this;
    setTimeout(function(){
      Transport.prototype.onData.call(self, data);
    }, 0);
  };
}

/**
 * Writes data to socket.
 *
 * @param {Array} array of packets.
 * @api private
 */

WS.prototype.write = function(packets){
  var self = this;
  this.writable = false;
  // encodePacket efficient as it uses WS framing
  // no need for encodePayload
  for (var i = 0, l = packets.length; i < l; i++) {
    parser.encodePacket(packets[i], this.supportsBinary, function(data) {
      //Sometimes the websocket has already been closed but the browser didn't
      //have a chance of informing us about it yet, in that case send will
      //throw an error
      try {
        self.ws.send(data);
      } catch (e){
        debug('websocket closed before onclose event');
      }
    });
  }

  function ondrain() {
    self.writable = true;
    self.emit('drain');
  }
  // fake drain
  // defer to next tick to allow Socket to clear writeBuffer
  setTimeout(ondrain, 0);
};

/**
 * Called upon close
 *
 * @api private
 */

WS.prototype.onClose = function(){
  Transport.prototype.onClose.call(this);
};

/**
 * Closes socket.
 *
 * @api private
 */

WS.prototype.doClose = function(){
  if (typeof this.ws !== 'undefined') {
    this.ws.close();
  }
};

/**
 * Generates uri for connection.
 *
 * @api private
 */

WS.prototype.uri = function(){
  var query = this.query || {};
  var schema = this.secure ? 'wss' : 'ws';
  var port = '';

  // avoid port if default for schema
  if (this.port && (('wss' == schema && this.port != 443)
    || ('ws' == schema && this.port != 80))) {
    port = ':' + this.port;
  }

  // append timestamp to URI
  if (this.timestampRequests) {
    query[this.timestampParam] = +new Date;
  }

  // communicate binary support capabilities
  if (!this.supportsBinary) {
    query.b64 = 1;
  }

  query = parseqs.encode(query);

  // prepend ? to query
  if (query.length) {
    query = '?' + query;
  }

  return schema + '://' + this.hostname + port + this.path + query;
};

/**
 * Feature detection for WebSocket.
 *
 * @return {Boolean} whether this transport is available.
 * @api public
 */

WS.prototype.check = function(){
  return !!WebSocket && !('__initialize' in WebSocket && this.name === WS.prototype.name);
};

},{"../transport":4,"component-inherit":13,"debug":14,"engine.io-parser":17,"parseqs":27,"ws":29}],10:[function(_dereq_,module,exports){
// browser shim for xmlhttprequest module
var hasCORS = _dereq_('has-cors');

module.exports = function(opts) {
  var xdomain = opts.xdomain;

  // scheme must be same when usign XDomainRequest
  // http://blogs.msdn.com/b/ieinternals/archive/2010/05/13/xdomainrequest-restrictions-limitations-and-workarounds.aspx
  var xscheme = opts.xscheme;

  // XDomainRequest has a flow of not sending cookie, therefore it should be disabled as a default.
  // https://github.com/Automattic/engine.io-client/pull/217
  var enablesXDR = opts.enablesXDR;

  // XMLHttpRequest can be disabled on IE
  try {
    if ('undefined' != typeof XMLHttpRequest && (!xdomain || hasCORS)) {
      return new XMLHttpRequest();
    }
  } catch (e) { }

  // Use XDomainRequest for IE8 if enablesXDR is true
  // because loading bar keeps flashing when using jsonp-polling
  // https://github.com/yujiosaka/socke.io-ie8-loading-example
  try {
    if ('undefined' != typeof XDomainRequest && !xscheme && enablesXDR) {
      return new XDomainRequest();
    }
  } catch (e) { }

  if (!xdomain) {
    try {
      return new ActiveXObject('Microsoft.XMLHTTP');
    } catch(e) { }
  }
}

},{"has-cors":23}],11:[function(_dereq_,module,exports){
(function (global){
/**
 * Create a blob builder even when vendor prefixes exist
 */

var BlobBuilder = global.BlobBuilder
  || global.WebKitBlobBuilder
  || global.MSBlobBuilder
  || global.MozBlobBuilder;

/**
 * Check if Blob constructor is supported
 */

var blobSupported = (function() {
  try {
    var b = new Blob(['hi']);
    return b.size == 2;
  } catch(e) {
    return false;
  }
})();

/**
 * Check if BlobBuilder is supported
 */

var blobBuilderSupported = BlobBuilder
  && BlobBuilder.prototype.append
  && BlobBuilder.prototype.getBlob;

function BlobBuilderConstructor(ary, options) {
  options = options || {};

  var bb = new BlobBuilder();
  for (var i = 0; i < ary.length; i++) {
    bb.append(ary[i]);
  }
  return (options.type) ? bb.getBlob(options.type) : bb.getBlob();
};

module.exports = (function() {
  if (blobSupported) {
    return global.Blob;
  } else if (blobBuilderSupported) {
    return BlobBuilderConstructor;
  } else {
    return undefined;
  }
})();

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],12:[function(_dereq_,module,exports){

/**
 * Expose `Emitter`.
 */

module.exports = Emitter;

/**
 * Initialize a new `Emitter`.
 *
 * @api public
 */

function Emitter(obj) {
  if (obj) return mixin(obj);
};

/**
 * Mixin the emitter properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (var key in Emitter.prototype) {
    obj[key] = Emitter.prototype[key];
  }
  return obj;
}

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.on =
Emitter.prototype.addEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};
  (this._callbacks[event] = this._callbacks[event] || [])
    .push(fn);
  return this;
};

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.once = function(event, fn){
  var self = this;
  this._callbacks = this._callbacks || {};

  function on() {
    self.off(event, on);
    fn.apply(this, arguments);
  }

  on.fn = fn;
  this.on(event, on);
  return this;
};

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.off =
Emitter.prototype.removeListener =
Emitter.prototype.removeAllListeners =
Emitter.prototype.removeEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};

  // all
  if (0 == arguments.length) {
    this._callbacks = {};
    return this;
  }

  // specific event
  var callbacks = this._callbacks[event];
  if (!callbacks) return this;

  // remove all handlers
  if (1 == arguments.length) {
    delete this._callbacks[event];
    return this;
  }

  // remove specific handler
  var cb;
  for (var i = 0; i < callbacks.length; i++) {
    cb = callbacks[i];
    if (cb === fn || cb.fn === fn) {
      callbacks.splice(i, 1);
      break;
    }
  }
  return this;
};

/**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} ...
 * @return {Emitter}
 */

Emitter.prototype.emit = function(event){
  this._callbacks = this._callbacks || {};
  var args = [].slice.call(arguments, 1)
    , callbacks = this._callbacks[event];

  if (callbacks) {
    callbacks = callbacks.slice(0);
    for (var i = 0, len = callbacks.length; i < len; ++i) {
      callbacks[i].apply(this, args);
    }
  }

  return this;
};

/**
 * Return array of callbacks for `event`.
 *
 * @param {String} event
 * @return {Array}
 * @api public
 */

Emitter.prototype.listeners = function(event){
  this._callbacks = this._callbacks || {};
  return this._callbacks[event] || [];
};

/**
 * Check if this emitter has `event` handlers.
 *
 * @param {String} event
 * @return {Boolean}
 * @api public
 */

Emitter.prototype.hasListeners = function(event){
  return !! this.listeners(event).length;
};

},{}],13:[function(_dereq_,module,exports){

module.exports = function(a, b){
  var fn = function(){};
  fn.prototype = b.prototype;
  a.prototype = new fn;
  a.prototype.constructor = a;
};
},{}],14:[function(_dereq_,module,exports){

/**
 * This is the web browser implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = _dereq_('./debug');
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;

/**
 * Colors.
 */

exports.colors = [
  'lightseagreen',
  'forestgreen',
  'goldenrod',
  'dodgerblue',
  'darkorchid',
  'crimson'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // is webkit? http://stackoverflow.com/a/16459606/376773
  return ('WebkitAppearance' in document.documentElement.style) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (window.console && (console.firebug || (console.exception && console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31);
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

exports.formatters.j = function(v) {
  return JSON.stringify(v);
};


/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs() {
  var args = arguments;
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ')
    + '+' + exports.humanize(this.diff);

  if (!useColors) return args;

  var c = 'color: ' + this.color;
  args = [args[0], c, 'color: inherit'].concat(Array.prototype.slice.call(args, 1));

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-z%]/g, function(match) {
    if ('%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
  return args;
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function log() {
  // This hackery is required for IE8,
  // where the `console.log` function doesn't have 'apply'
  return 'object' == typeof console
    && 'function' == typeof console.log
    && Function.prototype.apply.call(console.log, console, arguments);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  try {
    if (null == namespaces) {
      localStorage.removeItem('debug');
    } else {
      localStorage.debug = namespaces;
    }
  } catch(e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  var r;
  try {
    r = localStorage.debug;
  } catch(e) {}
  return r;
}

/**
 * Enable namespaces listed in `localStorage.debug` initially.
 */

exports.enable(load());

},{"./debug":15}],15:[function(_dereq_,module,exports){

/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = debug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = _dereq_('ms');

/**
 * The currently active debug mode names, and names to skip.
 */

exports.names = [];
exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lowercased letter, i.e. "n".
 */

exports.formatters = {};

/**
 * Previously assigned color.
 */

var prevColor = 0;

/**
 * Previous log timestamp.
 */

var prevTime;

/**
 * Select a color.
 *
 * @return {Number}
 * @api private
 */

function selectColor() {
  return exports.colors[prevColor++ % exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function debug(namespace) {

  // define the `disabled` version
  function disabled() {
  }
  disabled.enabled = false;

  // define the `enabled` version
  function enabled() {

    var self = enabled;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    // add the `color` if not set
    if (null == self.useColors) self.useColors = exports.useColors();
    if (null == self.color && self.useColors) self.color = selectColor();

    var args = Array.prototype.slice.call(arguments);

    args[0] = exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %o
      args = ['%o'].concat(args);
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-z%])/g, function(match, format) {
      // if we encounter an escaped % then don't increase the array index
      if (match === '%') return match;
      index++;
      var formatter = exports.formatters[format];
      if ('function' === typeof formatter) {
        var val = args[index];
        match = formatter.call(self, val);

        // now we need to remove `args[index]` since it's inlined in the `format`
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    if ('function' === typeof exports.formatArgs) {
      args = exports.formatArgs.apply(self, args);
    }
    var logFn = enabled.log || exports.log || console.log.bind(console);
    logFn.apply(self, args);
  }
  enabled.enabled = true;

  var fn = exports.enabled(namespace) ? enabled : disabled;

  fn.namespace = namespace;

  return fn;
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 * @api public
 */

function enable(namespaces) {
  exports.save(namespaces);

  var split = (namespaces || '').split(/[\s,]+/);
  var len = split.length;

  for (var i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }
}

/**
 * Disable debug output.
 *
 * @api public
 */

function disable() {
  exports.enable('');
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

function enabled(name) {
  var i, len;
  for (i = 0, len = exports.skips.length; i < len; i++) {
    if (exports.skips[i].test(name)) {
      return false;
    }
  }
  for (i = 0, len = exports.names.length; i < len; i++) {
    if (exports.names[i].test(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}

},{"ms":16}],16:[function(_dereq_,module,exports){
/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} options
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options){
  options = options || {};
  if ('string' == typeof val) return parse(val);
  return options.long
    ? _long(val)
    : _short(val);
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  var match = /^((?:\d+)?\.?\d+) *(ms|seconds?|s|minutes?|m|hours?|h|days?|d|years?|y)?$/i.exec(str);
  if (!match) return;
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'y':
      return n * y;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 's':
      return n * s;
    case 'ms':
      return n;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function _short(ms) {
  if (ms >= d) return Math.round(ms / d) + 'd';
  if (ms >= h) return Math.round(ms / h) + 'h';
  if (ms >= m) return Math.round(ms / m) + 'm';
  if (ms >= s) return Math.round(ms / s) + 's';
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function _long(ms) {
  return plural(ms, d, 'day')
    || plural(ms, h, 'hour')
    || plural(ms, m, 'minute')
    || plural(ms, s, 'second')
    || ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, n, name) {
  if (ms < n) return;
  if (ms < n * 1.5) return Math.floor(ms / n) + ' ' + name;
  return Math.ceil(ms / n) + ' ' + name + 's';
}

},{}],17:[function(_dereq_,module,exports){
(function (global){
/**
 * Module dependencies.
 */

var keys = _dereq_('./keys');
var sliceBuffer = _dereq_('arraybuffer.slice');
var base64encoder = _dereq_('base64-arraybuffer');
var after = _dereq_('after');
var utf8 = _dereq_('utf8');

/**
 * Check if we are running an android browser. That requires us to use
 * ArrayBuffer with polling transports...
 *
 * http://ghinda.net/jpeg-blob-ajax-android/
 */

var isAndroid = navigator.userAgent.match(/Android/i);

/**
 * Current protocol version.
 */

exports.protocol = 3;

/**
 * Packet types.
 */

var packets = exports.packets = {
    open:     0    // non-ws
  , close:    1    // non-ws
  , ping:     2
  , pong:     3
  , message:  4
  , upgrade:  5
  , noop:     6
};

var packetslist = keys(packets);

/**
 * Premade error packet.
 */

var err = { type: 'error', data: 'parser error' };

/**
 * Create a blob api even for blob builder when vendor prefixes exist
 */

var Blob = _dereq_('blob');

/**
 * Encodes a packet.
 *
 *     <packet type id> [ <data> ]
 *
 * Example:
 *
 *     5hello world
 *     3
 *     4
 *
 * Binary is encoded in an identical principle
 *
 * @api private
 */

exports.encodePacket = function (packet, supportsBinary, utf8encode, callback) {
  if ('function' == typeof supportsBinary) {
    callback = supportsBinary;
    supportsBinary = false;
  }

  if ('function' == typeof utf8encode) {
    callback = utf8encode;
    utf8encode = null;
  }

  var data = (packet.data === undefined)
    ? undefined
    : packet.data.buffer || packet.data;

  if (global.ArrayBuffer && data instanceof ArrayBuffer) {
    return encodeArrayBuffer(packet, supportsBinary, callback);
  } else if (Blob && data instanceof global.Blob) {
    return encodeBlob(packet, supportsBinary, callback);
  }

  // Sending data as a utf-8 string
  var encoded = packets[packet.type];

  // data fragment is optional
  if (undefined !== packet.data) {
    encoded += utf8encode ? utf8.encode(String(packet.data)) : String(packet.data);
  }

  return callback('' + encoded);

};

/**
 * Encode packet helpers for binary types
 */

function encodeArrayBuffer(packet, supportsBinary, callback) {
  if (!supportsBinary) {
    return exports.encodeBase64Packet(packet, callback);
  }

  var data = packet.data;
  var contentArray = new Uint8Array(data);
  var resultBuffer = new Uint8Array(1 + data.byteLength);

  resultBuffer[0] = packets[packet.type];
  for (var i = 0; i < contentArray.length; i++) {
    resultBuffer[i+1] = contentArray[i];
  }

  return callback(resultBuffer.buffer);
}

function encodeBlobAsArrayBuffer(packet, supportsBinary, callback) {
  if (!supportsBinary) {
    return exports.encodeBase64Packet(packet, callback);
  }

  var fr = new FileReader();
  fr.onload = function() {
    packet.data = fr.result;
    exports.encodePacket(packet, supportsBinary, true, callback);
  };
  return fr.readAsArrayBuffer(packet.data);
}

function encodeBlob(packet, supportsBinary, callback) {
  if (!supportsBinary) {
    return exports.encodeBase64Packet(packet, callback);
  }

  if (isAndroid) {
    return encodeBlobAsArrayBuffer(packet, supportsBinary, callback);
  }

  var length = new Uint8Array(1);
  length[0] = packets[packet.type];
  var blob = new Blob([length.buffer, packet.data]);

  return callback(blob);
}

/**
 * Encodes a packet with binary data in a base64 string
 *
 * @param {Object} packet, has `type` and `data`
 * @return {String} base64 encoded message
 */

exports.encodeBase64Packet = function(packet, callback) {
  var message = 'b' + exports.packets[packet.type];
  if (Blob && packet.data instanceof Blob) {
    var fr = new FileReader();
    fr.onload = function() {
      var b64 = fr.result.split(',')[1];
      callback(message + b64);
    };
    return fr.readAsDataURL(packet.data);
  }

  var b64data;
  try {
    b64data = String.fromCharCode.apply(null, new Uint8Array(packet.data));
  } catch (e) {
    // iPhone Safari doesn't let you apply with typed arrays
    var typed = new Uint8Array(packet.data);
    var basic = new Array(typed.length);
    for (var i = 0; i < typed.length; i++) {
      basic[i] = typed[i];
    }
    b64data = String.fromCharCode.apply(null, basic);
  }
  message += global.btoa(b64data);
  return callback(message);
};

/**
 * Decodes a packet. Changes format to Blob if requested.
 *
 * @return {Object} with `type` and `data` (if any)
 * @api private
 */

exports.decodePacket = function (data, binaryType, utf8decode) {
  // String data
  if (typeof data == 'string' || data === undefined) {
    if (data.charAt(0) == 'b') {
      return exports.decodeBase64Packet(data.substr(1), binaryType);
    }

    if (utf8decode) {
      try {
        data = utf8.decode(data);
      } catch (e) {
        return err;
      }
    }
    var type = data.charAt(0);

    if (Number(type) != type || !packetslist[type]) {
      return err;
    }

    if (data.length > 1) {
      return { type: packetslist[type], data: data.substring(1) };
    } else {
      return { type: packetslist[type] };
    }
  }

  var asArray = new Uint8Array(data);
  var type = asArray[0];
  var rest = sliceBuffer(data, 1);
  if (Blob && binaryType === 'blob') {
    rest = new Blob([rest]);
  }
  return { type: packetslist[type], data: rest };
};

/**
 * Decodes a packet encoded in a base64 string
 *
 * @param {String} base64 encoded message
 * @return {Object} with `type` and `data` (if any)
 */

exports.decodeBase64Packet = function(msg, binaryType) {
  var type = packetslist[msg.charAt(0)];
  if (!global.ArrayBuffer) {
    return { type: type, data: { base64: true, data: msg.substr(1) } };
  }

  var data = base64encoder.decode(msg.substr(1));

  if (binaryType === 'blob' && Blob) {
    data = new Blob([data]);
  }

  return { type: type, data: data };
};

/**
 * Encodes multiple messages (payload).
 *
 *     <length>:data
 *
 * Example:
 *
 *     11:hello world2:hi
 *
 * If any contents are binary, they will be encoded as base64 strings. Base64
 * encoded strings are marked with a b before the length specifier
 *
 * @param {Array} packets
 * @api private
 */

exports.encodePayload = function (packets, supportsBinary, callback) {
  if (typeof supportsBinary == 'function') {
    callback = supportsBinary;
    supportsBinary = null;
  }

  if (supportsBinary) {
    if (Blob && !isAndroid) {
      return exports.encodePayloadAsBlob(packets, callback);
    }

    return exports.encodePayloadAsArrayBuffer(packets, callback);
  }

  if (!packets.length) {
    return callback('0:');
  }

  function setLengthHeader(message) {
    return message.length + ':' + message;
  }

  function encodeOne(packet, doneCallback) {
    exports.encodePacket(packet, supportsBinary, true, function(message) {
      doneCallback(null, setLengthHeader(message));
    });
  }

  map(packets, encodeOne, function(err, results) {
    return callback(results.join(''));
  });
};

/**
 * Async array map using after
 */

function map(ary, each, done) {
  var result = new Array(ary.length);
  var next = after(ary.length, done);

  var eachWithIndex = function(i, el, cb) {
    each(el, function(error, msg) {
      result[i] = msg;
      cb(error, result);
    });
  };

  for (var i = 0; i < ary.length; i++) {
    eachWithIndex(i, ary[i], next);
  }
}

/*
 * Decodes data when a payload is maybe expected. Possible binary contents are
 * decoded from their base64 representation
 *
 * @param {String} data, callback method
 * @api public
 */

exports.decodePayload = function (data, binaryType, callback) {
  if (typeof data != 'string') {
    return exports.decodePayloadAsBinary(data, binaryType, callback);
  }

  if (typeof binaryType === 'function') {
    callback = binaryType;
    binaryType = null;
  }

  var packet;
  if (data == '') {
    // parser error - ignoring payload
    return callback(err, 0, 1);
  }

  var length = ''
    , n, msg;

  for (var i = 0, l = data.length; i < l; i++) {
    var chr = data.charAt(i);

    if (':' != chr) {
      length += chr;
    } else {
      if ('' == length || (length != (n = Number(length)))) {
        // parser error - ignoring payload
        return callback(err, 0, 1);
      }

      msg = data.substr(i + 1, n);

      if (length != msg.length) {
        // parser error - ignoring payload
        return callback(err, 0, 1);
      }

      if (msg.length) {
        packet = exports.decodePacket(msg, binaryType, true);

        if (err.type == packet.type && err.data == packet.data) {
          // parser error in individual packet - ignoring payload
          return callback(err, 0, 1);
        }

        var ret = callback(packet, i + n, l);
        if (false === ret) return;
      }

      // advance cursor
      i += n;
      length = '';
    }
  }

  if (length != '') {
    // parser error - ignoring payload
    return callback(err, 0, 1);
  }

};

/**
 * Encodes multiple messages (payload) as binary.
 *
 * <1 = binary, 0 = string><number from 0-9><number from 0-9>[...]<number
 * 255><data>
 *
 * Example:
 * 1 3 255 1 2 3, if the binary contents are interpreted as 8 bit integers
 *
 * @param {Array} packets
 * @return {ArrayBuffer} encoded payload
 * @api private
 */

exports.encodePayloadAsArrayBuffer = function(packets, callback) {
  if (!packets.length) {
    return callback(new ArrayBuffer(0));
  }

  function encodeOne(packet, doneCallback) {
    exports.encodePacket(packet, true, true, function(data) {
      return doneCallback(null, data);
    });
  }

  map(packets, encodeOne, function(err, encodedPackets) {
    var totalLength = encodedPackets.reduce(function(acc, p) {
      var len;
      if (typeof p === 'string'){
        len = p.length;
      } else {
        len = p.byteLength;
      }
      return acc + len.toString().length + len + 2; // string/binary identifier + separator = 2
    }, 0);

    var resultArray = new Uint8Array(totalLength);

    var bufferIndex = 0;
    encodedPackets.forEach(function(p) {
      var isString = typeof p === 'string';
      var ab = p;
      if (isString) {
        var view = new Uint8Array(p.length);
        for (var i = 0; i < p.length; i++) {
          view[i] = p.charCodeAt(i);
        }
        ab = view.buffer;
      }

      if (isString) { // not true binary
        resultArray[bufferIndex++] = 0;
      } else { // true binary
        resultArray[bufferIndex++] = 1;
      }

      var lenStr = ab.byteLength.toString();
      for (var i = 0; i < lenStr.length; i++) {
        resultArray[bufferIndex++] = parseInt(lenStr[i]);
      }
      resultArray[bufferIndex++] = 255;

      var view = new Uint8Array(ab);
      for (var i = 0; i < view.length; i++) {
        resultArray[bufferIndex++] = view[i];
      }
    });

    return callback(resultArray.buffer);
  });
};

/**
 * Encode as Blob
 */

exports.encodePayloadAsBlob = function(packets, callback) {
  function encodeOne(packet, doneCallback) {
    exports.encodePacket(packet, true, true, function(encoded) {
      var binaryIdentifier = new Uint8Array(1);
      binaryIdentifier[0] = 1;
      if (typeof encoded === 'string') {
        var view = new Uint8Array(encoded.length);
        for (var i = 0; i < encoded.length; i++) {
          view[i] = encoded.charCodeAt(i);
        }
        encoded = view.buffer;
        binaryIdentifier[0] = 0;
      }

      var len = (encoded instanceof ArrayBuffer)
        ? encoded.byteLength
        : encoded.size;

      var lenStr = len.toString();
      var lengthAry = new Uint8Array(lenStr.length + 1);
      for (var i = 0; i < lenStr.length; i++) {
        lengthAry[i] = parseInt(lenStr[i]);
      }
      lengthAry[lenStr.length] = 255;

      if (Blob) {
        var blob = new Blob([binaryIdentifier.buffer, lengthAry.buffer, encoded]);
        doneCallback(null, blob);
      }
    });
  }

  map(packets, encodeOne, function(err, results) {
    return callback(new Blob(results));
  });
};

/*
 * Decodes data when a payload is maybe expected. Strings are decoded by
 * interpreting each byte as a key code for entries marked to start with 0. See
 * description of encodePayloadAsBinary
 *
 * @param {ArrayBuffer} data, callback method
 * @api public
 */

exports.decodePayloadAsBinary = function (data, binaryType, callback) {
  if (typeof binaryType === 'function') {
    callback = binaryType;
    binaryType = null;
  }

  var bufferTail = data;
  var buffers = [];

  var numberTooLong = false;
  while (bufferTail.byteLength > 0) {
    var tailArray = new Uint8Array(bufferTail);
    var isString = tailArray[0] === 0;
    var msgLength = '';

    for (var i = 1; ; i++) {
      if (tailArray[i] == 255) break;

      if (msgLength.length > 310) {
        numberTooLong = true;
        break;
      }

      msgLength += tailArray[i];
    }

    if(numberTooLong) return callback(err, 0, 1);

    bufferTail = sliceBuffer(bufferTail, 2 + msgLength.length);
    msgLength = parseInt(msgLength);

    var msg = sliceBuffer(bufferTail, 0, msgLength);
    if (isString) {
      try {
        msg = String.fromCharCode.apply(null, new Uint8Array(msg));
      } catch (e) {
        // iPhone Safari doesn't let you apply to typed arrays
        var typed = new Uint8Array(msg);
        msg = '';
        for (var i = 0; i < typed.length; i++) {
          msg += String.fromCharCode(typed[i]);
        }
      }
    }

    buffers.push(msg);
    bufferTail = sliceBuffer(bufferTail, msgLength);
  }

  var total = buffers.length;
  buffers.forEach(function(buffer, i) {
    callback(exports.decodePacket(buffer, binaryType, true), i, total);
  });
};

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./keys":18,"after":19,"arraybuffer.slice":20,"base64-arraybuffer":21,"blob":11,"utf8":22}],18:[function(_dereq_,module,exports){

/**
 * Gets the keys for an object.
 *
 * @return {Array} keys
 * @api private
 */

module.exports = Object.keys || function keys (obj){
  var arr = [];
  var has = Object.prototype.hasOwnProperty;

  for (var i in obj) {
    if (has.call(obj, i)) {
      arr.push(i);
    }
  }
  return arr;
};

},{}],19:[function(_dereq_,module,exports){
module.exports = after

function after(count, callback, err_cb) {
    var bail = false
    err_cb = err_cb || noop
    proxy.count = count

    return (count === 0) ? callback() : proxy

    function proxy(err, result) {
        if (proxy.count <= 0) {
            throw new Error('after called too many times')
        }
        --proxy.count

        // after first error, rest are passed to err_cb
        if (err) {
            bail = true
            callback(err)
            // future error callbacks will go to error handler
            callback = err_cb
        } else if (proxy.count === 0 && !bail) {
            callback(null, result)
        }
    }
}

function noop() {}

},{}],20:[function(_dereq_,module,exports){
/**
 * An abstraction for slicing an arraybuffer even when
 * ArrayBuffer.prototype.slice is not supported
 *
 * @api public
 */

module.exports = function(arraybuffer, start, end) {
  var bytes = arraybuffer.byteLength;
  start = start || 0;
  end = end || bytes;

  if (arraybuffer.slice) { return arraybuffer.slice(start, end); }

  if (start < 0) { start += bytes; }
  if (end < 0) { end += bytes; }
  if (end > bytes) { end = bytes; }

  if (start >= bytes || start >= end || bytes === 0) {
    return new ArrayBuffer(0);
  }

  var abv = new Uint8Array(arraybuffer);
  var result = new Uint8Array(end - start);
  for (var i = start, ii = 0; i < end; i++, ii++) {
    result[ii] = abv[i];
  }
  return result.buffer;
};

},{}],21:[function(_dereq_,module,exports){
/*
 * base64-arraybuffer
 * https://github.com/niklasvh/base64-arraybuffer
 *
 * Copyright (c) 2012 Niklas von Hertzen
 * Licensed under the MIT license.
 */
(function(chars){
  "use strict";

  exports.encode = function(arraybuffer) {
    var bytes = new Uint8Array(arraybuffer),
    i, len = bytes.length, base64 = "";

    for (i = 0; i < len; i+=3) {
      base64 += chars[bytes[i] >> 2];
      base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
      base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
      base64 += chars[bytes[i + 2] & 63];
    }

    if ((len % 3) === 2) {
      base64 = base64.substring(0, base64.length - 1) + "=";
    } else if (len % 3 === 1) {
      base64 = base64.substring(0, base64.length - 2) + "==";
    }

    return base64;
  };

  exports.decode =  function(base64) {
    var bufferLength = base64.length * 0.75,
    len = base64.length, i, p = 0,
    encoded1, encoded2, encoded3, encoded4;

    if (base64[base64.length - 1] === "=") {
      bufferLength--;
      if (base64[base64.length - 2] === "=") {
        bufferLength--;
      }
    }

    var arraybuffer = new ArrayBuffer(bufferLength),
    bytes = new Uint8Array(arraybuffer);

    for (i = 0; i < len; i+=4) {
      encoded1 = chars.indexOf(base64[i]);
      encoded2 = chars.indexOf(base64[i+1]);
      encoded3 = chars.indexOf(base64[i+2]);
      encoded4 = chars.indexOf(base64[i+3]);

      bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
      bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
      bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
    }

    return arraybuffer;
  };
})("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/");

},{}],22:[function(_dereq_,module,exports){
(function (global){
/*! http://mths.be/utf8js v2.0.0 by @mathias */
;(function(root) {

	// Detect free variables `exports`
	var freeExports = typeof exports == 'object' && exports;

	// Detect free variable `module`
	var freeModule = typeof module == 'object' && module &&
		module.exports == freeExports && module;

	// Detect free variable `global`, from Node.js or Browserified code,
	// and use it as `root`
	var freeGlobal = typeof global == 'object' && global;
	if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal) {
		root = freeGlobal;
	}

	/*--------------------------------------------------------------------------*/

	var stringFromCharCode = String.fromCharCode;

	// Taken from http://mths.be/punycode
	function ucs2decode(string) {
		var output = [];
		var counter = 0;
		var length = string.length;
		var value;
		var extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	// Taken from http://mths.be/punycode
	function ucs2encode(array) {
		var length = array.length;
		var index = -1;
		var value;
		var output = '';
		while (++index < length) {
			value = array[index];
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
		}
		return output;
	}

	/*--------------------------------------------------------------------------*/

	function createByte(codePoint, shift) {
		return stringFromCharCode(((codePoint >> shift) & 0x3F) | 0x80);
	}

	function encodeCodePoint(codePoint) {
		if ((codePoint & 0xFFFFFF80) == 0) { // 1-byte sequence
			return stringFromCharCode(codePoint);
		}
		var symbol = '';
		if ((codePoint & 0xFFFFF800) == 0) { // 2-byte sequence
			symbol = stringFromCharCode(((codePoint >> 6) & 0x1F) | 0xC0);
		}
		else if ((codePoint & 0xFFFF0000) == 0) { // 3-byte sequence
			symbol = stringFromCharCode(((codePoint >> 12) & 0x0F) | 0xE0);
			symbol += createByte(codePoint, 6);
		}
		else if ((codePoint & 0xFFE00000) == 0) { // 4-byte sequence
			symbol = stringFromCharCode(((codePoint >> 18) & 0x07) | 0xF0);
			symbol += createByte(codePoint, 12);
			symbol += createByte(codePoint, 6);
		}
		symbol += stringFromCharCode((codePoint & 0x3F) | 0x80);
		return symbol;
	}

	function utf8encode(string) {
		var codePoints = ucs2decode(string);

		// console.log(JSON.stringify(codePoints.map(function(x) {
		// 	return 'U+' + x.toString(16).toUpperCase();
		// })));

		var length = codePoints.length;
		var index = -1;
		var codePoint;
		var byteString = '';
		while (++index < length) {
			codePoint = codePoints[index];
			byteString += encodeCodePoint(codePoint);
		}
		return byteString;
	}

	/*--------------------------------------------------------------------------*/

	function readContinuationByte() {
		if (byteIndex >= byteCount) {
			throw Error('Invalid byte index');
		}

		var continuationByte = byteArray[byteIndex] & 0xFF;
		byteIndex++;

		if ((continuationByte & 0xC0) == 0x80) {
			return continuationByte & 0x3F;
		}

		// If we end up here, it’s not a continuation byte
		throw Error('Invalid continuation byte');
	}

	function decodeSymbol() {
		var byte1;
		var byte2;
		var byte3;
		var byte4;
		var codePoint;

		if (byteIndex > byteCount) {
			throw Error('Invalid byte index');
		}

		if (byteIndex == byteCount) {
			return false;
		}

		// Read first byte
		byte1 = byteArray[byteIndex] & 0xFF;
		byteIndex++;

		// 1-byte sequence (no continuation bytes)
		if ((byte1 & 0x80) == 0) {
			return byte1;
		}

		// 2-byte sequence
		if ((byte1 & 0xE0) == 0xC0) {
			var byte2 = readContinuationByte();
			codePoint = ((byte1 & 0x1F) << 6) | byte2;
			if (codePoint >= 0x80) {
				return codePoint;
			} else {
				throw Error('Invalid continuation byte');
			}
		}

		// 3-byte sequence (may include unpaired surrogates)
		if ((byte1 & 0xF0) == 0xE0) {
			byte2 = readContinuationByte();
			byte3 = readContinuationByte();
			codePoint = ((byte1 & 0x0F) << 12) | (byte2 << 6) | byte3;
			if (codePoint >= 0x0800) {
				return codePoint;
			} else {
				throw Error('Invalid continuation byte');
			}
		}

		// 4-byte sequence
		if ((byte1 & 0xF8) == 0xF0) {
			byte2 = readContinuationByte();
			byte3 = readContinuationByte();
			byte4 = readContinuationByte();
			codePoint = ((byte1 & 0x0F) << 0x12) | (byte2 << 0x0C) |
				(byte3 << 0x06) | byte4;
			if (codePoint >= 0x010000 && codePoint <= 0x10FFFF) {
				return codePoint;
			}
		}

		throw Error('Invalid UTF-8 detected');
	}

	var byteArray;
	var byteCount;
	var byteIndex;
	function utf8decode(byteString) {
		byteArray = ucs2decode(byteString);
		byteCount = byteArray.length;
		byteIndex = 0;
		var codePoints = [];
		var tmp;
		while ((tmp = decodeSymbol()) !== false) {
			codePoints.push(tmp);
		}
		return ucs2encode(codePoints);
	}

	/*--------------------------------------------------------------------------*/

	var utf8 = {
		'version': '2.0.0',
		'encode': utf8encode,
		'decode': utf8decode
	};

	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		typeof define == 'function' &&
		typeof define.amd == 'object' &&
		define.amd
	) {
		define(function() {
			return utf8;
		});
	}	else if (freeExports && !freeExports.nodeType) {
		if (freeModule) { // in Node.js or RingoJS v0.8.0+
			freeModule.exports = utf8;
		} else { // in Narwhal or RingoJS v0.7.0-
			var object = {};
			var hasOwnProperty = object.hasOwnProperty;
			for (var key in utf8) {
				hasOwnProperty.call(utf8, key) && (freeExports[key] = utf8[key]);
			}
		}
	} else { // in Rhino or a web browser
		root.utf8 = utf8;
	}

}(this));

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],23:[function(_dereq_,module,exports){

/**
 * Module dependencies.
 */

var global = _dereq_('global');

/**
 * Module exports.
 *
 * Logic borrowed from Modernizr:
 *
 *   - https://github.com/Modernizr/Modernizr/blob/master/feature-detects/cors.js
 */

try {
  module.exports = 'XMLHttpRequest' in global &&
    'withCredentials' in new global.XMLHttpRequest();
} catch (err) {
  // if XMLHttp support is disabled in IE then it will throw
  // when trying to create
  module.exports = false;
}

},{"global":24}],24:[function(_dereq_,module,exports){

/**
 * Returns `this`. Execute this without a "context" (i.e. without it being
 * attached to an object of the left-hand side), and `this` points to the
 * "global" scope of the current JS execution.
 */

module.exports = (function () { return this; })();

},{}],25:[function(_dereq_,module,exports){

var indexOf = [].indexOf;

module.exports = function(arr, obj){
  if (indexOf) return arr.indexOf(obj);
  for (var i = 0; i < arr.length; ++i) {
    if (arr[i] === obj) return i;
  }
  return -1;
};
},{}],26:[function(_dereq_,module,exports){
(function (global){
/**
 * JSON parse.
 *
 * @see Based on jQuery#parseJSON (MIT) and JSON2
 * @api private
 */

var rvalidchars = /^[\],:{}\s]*$/;
var rvalidescape = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g;
var rvalidtokens = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g;
var rvalidbraces = /(?:^|:|,)(?:\s*\[)+/g;
var rtrimLeft = /^\s+/;
var rtrimRight = /\s+$/;

module.exports = function parsejson(data) {
  if ('string' != typeof data || !data) {
    return null;
  }

  data = data.replace(rtrimLeft, '').replace(rtrimRight, '');

  // Attempt to parse using the native JSON parser first
  if (global.JSON && JSON.parse) {
    return JSON.parse(data);
  }

  if (rvalidchars.test(data.replace(rvalidescape, '@')
      .replace(rvalidtokens, ']')
      .replace(rvalidbraces, ''))) {
    return (new Function('return ' + data))();
  }
};
}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],27:[function(_dereq_,module,exports){
/**
 * Compiles a querystring
 * Returns string representation of the object
 *
 * @param {Object}
 * @api private
 */

exports.encode = function (obj) {
  var str = '';

  for (var i in obj) {
    if (obj.hasOwnProperty(i)) {
      if (str.length) str += '&';
      str += encodeURIComponent(i) + '=' + encodeURIComponent(obj[i]);
    }
  }

  return str;
};

/**
 * Parses a simple querystring into an object
 *
 * @param {String} qs
 * @api private
 */

exports.decode = function(qs){
  var qry = {};
  var pairs = qs.split('&');
  for (var i = 0, l = pairs.length; i < l; i++) {
    var pair = pairs[i].split('=');
    qry[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
  }
  return qry;
};

},{}],28:[function(_dereq_,module,exports){
/**
 * Parses an URI
 *
 * @author Steven Levithan <stevenlevithan.com> (MIT license)
 * @api private
 */

var re = /^(?:(?![^:@]+:[^:@\/]*@)(http|https|ws|wss):\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?((?:[a-f0-9]{0,4}:){2,7}[a-f0-9]{0,4}|[^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;

var parts = [
    'source', 'protocol', 'authority', 'userInfo', 'user', 'password', 'host', 'port', 'relative', 'path', 'directory', 'file', 'query', 'anchor'
];

module.exports = function parseuri(str) {
    var src = str,
        b = str.indexOf('['),
        e = str.indexOf(']');

    if (b != -1 && e != -1) {
        str = str.substring(0, b) + str.substring(b, e).replace(/:/g, ';') + str.substring(e, str.length);
    }

    var m = re.exec(str || ''),
        uri = {},
        i = 14;

    while (i--) {
        uri[parts[i]] = m[i] || '';
    }

    if (b != -1 && e != -1) {
        uri.source = src;
        uri.host = uri.host.substring(1, uri.host.length - 1).replace(/;/g, ':');
        uri.authority = uri.authority.replace('[', '').replace(']', '').replace(/;/g, ':');
        uri.ipv6uri = true;
    }

    return uri;
};

},{}],29:[function(_dereq_,module,exports){

/**
 * Module dependencies.
 */

var global = (function() { return this; })();

/**
 * WebSocket constructor.
 */

var WebSocket = global.WebSocket || global.MozWebSocket;

/**
 * Module exports.
 */

module.exports = WebSocket ? ws : null;

/**
 * WebSocket constructor.
 *
 * The third `opts` options object gets ignored in web browsers, since it's
 * non-standard, and throws a TypeError if passed to the constructor.
 * See: https://github.com/einaros/ws/issues/227
 *
 * @param {String} uri
 * @param {Array} protocols (optional)
 * @param {Object) opts (optional)
 * @api public
 */

function ws(uri, protocols, opts) {
  var instance;
  if (protocols) {
    instance = new WebSocket(uri, protocols);
  } else {
    instance = new WebSocket(uri);
  }
  return instance;
}

if (WebSocket) ws.prototype = WebSocket.prototype;

},{}]},{},[1])(1)
});  spike.Channel = function(uri, opts){
	if (!(this instanceof spike.Channel)) 
		return new spike.Channel(uri, opts);

	if (uri && ('object' == typeof uri)) {
		opts = uri;
		uri = undefined;
	}
	opts = opts || {};

	// Make sure we have a correct path
	opts.path = '/engine.io';
	var self = this;

	// Main properties
	this.opts = opts;
	this.endPoint = uri;
	this.buffer = new spike.ByteArray();
	this.readyState = 'closed';
	this.socket = null;
	this.transport = "";
	this.autoConnect = opts.autoConnect !== false;
	this._partialRecord = false;

	// Reconnection options
	this.reconnection(opts.reconnection !== false);
	this.reconnectionAttempts(opts.reconnectionAttempts || Infinity);
	this.reconnectionDelay(opts.reconnectionDelay || 1000);
	this.reconnectionDelayMax(opts.reconnectionDelayMax || 5000);
	this.randomizationFactor(opts.randomizationFactor || 0.5);
	this.timeout(null == opts.timeout ? 20000 : opts.timeout);
	this.backoff = new spike.Backoff({
		min: this.reconnectionDelay(),
		max: this.reconnectionDelayMax(),
		jitter: this.randomizationFactor()
	});

	// We need to close every time the window is unloading
	window.addEventListener("beforeunload", function( event ) {
		console.log("beforeunload");
		self.disconnect();
	});

	// Event: occurs when the client is connected to the server.
	this.onConnect = null;

	// Event: occurs when the client is disconnected from the server.
	this.onDisconnect = null;
	// Event: occurs when the MyChatMessagesInform inform is received from the server. 
	this.myChatMessagesInform = null; 

	// Event: occurs when the GetAllInform inform is received from the server. 
	this.getAllInform = null; 

	// Event: occurs when the CheckInform inform is received from the server. 
	this.checkInform = null; 

	// Event: occurs when the GetInform inform is received from the server. 
	this.getInform = null; 

	// Event: occurs when the EventInform inform is received from the server. 
	this.eventInform = null; 

	// Event: occurs when the PingInform inform is received from the server. 
	this.pingInform = null; 

	// Event: occurs when the GetServerTimeInform inform is received from the server. 
	this.getServerTimeInform = null; 

	// Event: occurs when the SupplyCredentialsInform inform is received from the server. 
	this.supplyCredentialsInform = null; 

	// Event: occurs when the RevokeCredentialsInform inform is received from the server. 
	this.revokeCredentialsInform = null; 

	// Event: occurs when the HubSubscribeInform inform is received from the server. 
	this.hubSubscribeInform = null; 

	// Event: occurs when the HubUnsubscribeInform inform is received from the server. 
	this.hubUnsubscribeInform = null; 

	// Event: occurs when the HubPublishInform inform is received from the server. 
	this.hubPublishInform = null; 

	// Event: occurs when the HubEventInform inform is received from the server. 
	this.hubEventInform = null; 

	
	// Attempt to auto-connect if specified (default behavior)
	if (this.autoConnect) this.open();
};
		    
	// Send Methods    
	/* Sends a JoinMyChat request to the remote server. */	
spike.Channel.prototype.joinMyChat = function(){
		
	var writer = new spike.PacketWriter();
		
	
	this.send("84157E5C", writer);
};

	/* Sends a SendMyChatMessage request to the remote server. */	
spike.Channel.prototype.sendMyChatMessage = function(message){
		
	var writer = new spike.PacketWriter();
	writer.writeString(message);
		
	writer.compress();
	this.send("BD7E2CA4", writer);
};

	/* Sends a GetAll request to the remote server. */	
spike.Channel.prototype.getAll = function(){
		
	var writer = new spike.PacketWriter();
		
	
	this.send("B22E7270", writer);
};

	/* Sends a Check request to the remote server. */	
spike.Channel.prototype.check = function(key, value){
		
	var writer = new spike.PacketWriter();
	writer.writeString(key);
	writer.writeDynamicType(value);
		
	
	this.send("70D7B183", writer);
};

	/* Sends a Get request to the remote server. */	
spike.Channel.prototype.get = function(key){
		
	var writer = new spike.PacketWriter();
	writer.writeString(key);
		
	
	this.send("3E05ECEE", writer);
};

	/* Sends a Ping request to the remote server. */	
spike.Channel.prototype.ping = function(){
		
	var writer = new spike.PacketWriter();
		
	
	this.send("26792C94", writer);
};

	/* Sends a GetServerTime request to the remote server. */	
spike.Channel.prototype.getServerTime = function(){
		
	var writer = new spike.PacketWriter();
		
	
	this.send("33E7FBD1", writer);
};

	/* Sends a SupplyCredentials request to the remote server. */	
spike.Channel.prototype.supplyCredentials = function(credentialsUri, credentialsType, userName, password, domain){
		
	var writer = new spike.PacketWriter();
	writer.writeString(credentialsUri);
	writer.writeString(credentialsType);
	writer.writeString(userName);
	writer.writeString(password);
	writer.writeString(domain);
		
	writer.compress();
	this.send("8D98E9FC", writer);
};

	/* Sends a RevokeCredentials request to the remote server. */	
spike.Channel.prototype.revokeCredentials = function(credentialsUri, credentialsType){
		
	var writer = new spike.PacketWriter();
	writer.writeString(credentialsUri);
	writer.writeString(credentialsType);
		
	writer.compress();
	this.send("4AC51818", writer);
};

	/* Sends a HubSubscribe request to the remote server. */	
spike.Channel.prototype.hubSubscribe = function(hubName, subscribeKey){
		
	var writer = new spike.PacketWriter();
	writer.writeString(hubName);
	writer.writeString(subscribeKey);
		
	writer.compress();
	this.send("2DD19B9B", writer);
};

	/* Sends a HubUnsubscribe request to the remote server. */	
spike.Channel.prototype.hubUnsubscribe = function(hubName, subscribeKey){
		
	var writer = new spike.PacketWriter();
	writer.writeString(hubName);
	writer.writeString(subscribeKey);
		
	writer.compress();
	this.send("6C63B75", writer);
};

	/* Sends a HubPublish request to the remote server. */	
spike.Channel.prototype.hubPublish = function(hubName, publishKey, message){
		
	var writer = new spike.PacketWriter();
	writer.writeString(hubName);
	writer.writeString(publishKey);
	writer.writeString(message);
		
	writer.compress();
	this.send("96B41079", writer);
};


// Dispatcher
spike.Channel.prototype.onReceive = function(key, reader){
	switch (key){
			
		// MyChatMessagesInform 	
		case "F6F85E84": {
			reader.decompress();
			var packet = new Object();
			packet.avatar = reader.readArrayOfByte();
			packet.message = reader.readString();

			if (this.myChatMessagesInform != null)
				this.myChatMessagesInform(packet, this);
			this.emit('myChatMessagesInform', packet);
			this.emit('myChatMessages', packet);

		} break;

			
		// GetAllInform 	
		case "B22E7270": {
			
			var packet = new Object();
			packet.table = reader.readArrayOfParameter();

			if (this.getAllInform != null)
				this.getAllInform(packet, this);
			this.emit('getAllInform', packet);
			this.emit('getAll', packet);

		} break;

			
		// CheckInform 	
		case "70D7B183": {
			
			var packet = new Object();
			packet.key = reader.readString();
			packet.value = reader.readDynamicType();
			packet.success = reader.readBoolean();

			if (this.checkInform != null)
				this.checkInform(packet, this);
			this.emit('checkInform', packet);
			this.emit('check', packet);

		} break;

			
		// GetInform 	
		case "3E05ECEE": {
			
			var packet = new Object();
			packet.value = reader.readDynamicType();

			if (this.getInform != null)
				this.getInform(packet, this);
			this.emit('getInform', packet);
			this.emit('get', packet);

		} break;

			
		// EventInform 	
		case "BA220D80": {
			
			var packet = new Object();
			packet.message = reader.readString();
			packet.time = reader.readDateTime();

			if (this.eventInform != null)
				this.eventInform(packet, this);
			this.emit('eventInform', packet);
			this.emit('event', packet);

		} break;

			
		// PingInform 	
		case "26792C94": {
			
			var packet = new Object();
			packet.pong = reader.readBoolean();

			if (this.pingInform != null)
				this.pingInform(packet, this);
			this.emit('pingInform', packet);
			this.emit('ping', packet);

		} break;

			
		// GetServerTimeInform 	
		case "33E7FBD1": {
			reader.decompress();
			var packet = new Object();
			packet.serverTime = reader.readDateTime();

			if (this.getServerTimeInform != null)
				this.getServerTimeInform(packet, this);
			this.emit('getServerTimeInform', packet);
			this.emit('getServerTime', packet);

		} break;

			
		// SupplyCredentialsInform 	
		case "8D98E9FC": {
			
			var packet = new Object();
			packet.result = reader.readBoolean();

			if (this.supplyCredentialsInform != null)
				this.supplyCredentialsInform(packet, this);
			this.emit('supplyCredentialsInform', packet);
			this.emit('supplyCredentials', packet);

		} break;

			
		// RevokeCredentialsInform 	
		case "4AC51818": {
			
			var packet = new Object();
			packet.result = reader.readBoolean();

			if (this.revokeCredentialsInform != null)
				this.revokeCredentialsInform(packet, this);
			this.emit('revokeCredentialsInform', packet);
			this.emit('revokeCredentials', packet);

		} break;

			
		// HubSubscribeInform 	
		case "2DD19B9B": {
			
			var packet = new Object();
			packet.status = reader.readInt16();

			if (this.hubSubscribeInform != null)
				this.hubSubscribeInform(packet, this);
			this.emit('hubSubscribeInform', packet);
			this.emit('hubSubscribe', packet);

		} break;

			
		// HubUnsubscribeInform 	
		case "6C63B75": {
			
			var packet = new Object();
			packet.status = reader.readInt16();

			if (this.hubUnsubscribeInform != null)
				this.hubUnsubscribeInform(packet, this);
			this.emit('hubUnsubscribeInform', packet);
			this.emit('hubUnsubscribe', packet);

		} break;

			
		// HubPublishInform 	
		case "96B41079": {
			
			var packet = new Object();
			packet.status = reader.readInt16();

			if (this.hubPublishInform != null)
				this.hubPublishInform(packet, this);
			this.emit('hubPublishInform', packet);
			this.emit('hubPublish', packet);

		} break;

			
		// HubEventInform 	
		case "65B2818C": {
			reader.decompress();
			var packet = new Object();
			packet.hubName = reader.readString();
			packet.message = reader.readString();
			packet.time = reader.readDateTime();

			if (this.hubEventInform != null)
				this.hubEventInform(packet, this);
			this.emit('hubEventInform', packet);
			this.emit('hubEvent', packet);

		} break;


		default: throw new Error("Received an unknown packet with '" + key + "' key.");
	}
};

/**
 * Sends the data to the remote endpoint 
 *
 * @param {String} the operation id to send
 * @param {spike.PacketWriter} the packet writer containing the buffer
 * @api private
 */
spike.Channel.prototype.send = function(operationKey, writer) {
	if(typeof operationKey === 'undefined' )
		throw new Error("Attempting to send without specifying the operation.")
	if(typeof writer === 'undefined')
		throw new Error("Attempting to send an undefined buffer.")

	// Initialize size variables
	var sizeOfKey = 4;
	var sizeOfLen = 4;
	var sizeTotal = 8;

	// Writes the length of the packet, the operation and the data
	var length   = writer == null ? 0 : writer.buffer.getSize();
	var compiled = new spike.PacketWriter();

	// Write the length of the packet
	compiled.writeUInt32(length + sizeOfKey);

	// Write the key of the packet
	compiled.writeKey(operationKey);
	
	// Write the body
	if(length > 0){
		// Write the body to our compiled buffer
		writer.buffer.position = 0;
		compiled.buffer.writeBytes(writer.buffer.readBytes(length));
	}

	// Send the payload in base64
	var data = spike.binarySupport 
		? compiled.buffer.toBuffer()
		: compiled.buffer.toBase64();
	
	//spike.debug('Sending buffer: %s (%s)', data, (typeof data).toString());
	this.socket.send(data);
};


/**
* Sets the current transport `socket`.
*
* @param {Function} optional, callback
* @return {Channel} self
* @api public
*/
spike.Channel.prototype.open =
spike.Channel.prototype.connect = function(fn){
	if (~this.readyState.indexOf('open')) return this;
	
	// Create a new socket and try to connect
	this.socket = eio.Socket(this.endPoint);
	this.socket._channel = this;

	// Set the 'opening' state
	var self = this;
	var socket = this.socket;
	this.readyState = 'opening';
	this.skipReconnect = false;

	// Hook socket 'open' event 
	this.socket.on('open', function(){
		spike.debug('socket opened');
		this._channel.onopen();
		fn && fn();
	});

	// Hook the error on connection
	this.socket.on('error', function(data){
		spike.debug('socket error: %s', data);
		self.readyState = 'closed';
		self.emit('connect_error', data);
		if (fn) {
			var err = new Error('Connection error');
			err.data = data;
			fn(err);
		} else {
			// Only do this if there is no fn to handle the error
			self.maybeReconnectOnOpen();
		}
	});

	// emit `connect_timeout`
	if (false !== this._timeout) {
		var timeout = this._timeout;
		spike.debug('connect attempt will timeout after %d', timeout);

		// set timer
		var timer = setTimeout(function(){
			if(self.readyState == 'open') return;

			spike.debug('connect attempt timed out after %d', timeout);
			socket.close();
			socket.emit('error', 'timeout');
			self.emit('connect_timeout', timeout);
		}, timeout);
	}

	// Hook socket 'close' event 
	this.socket.on('close', function(reason){
		self.transport = null;
		if (self.onDisconnect != null)
			self.onDisconnect();
		self.emit('disconnect');
		self.onclose(reason);
	});

	// Invoked when the socked receives incoming data 
	this.socket.on('message', function(payload) {

		// Initialize size variables
		var sizeOfKey = 4;
		var sizeOfLen = 4;
		var sizeTotal = 8;

		var data = new spike.ByteArray();
		var channel = this._channel;
		if (channel._partialRecord)
		{
			channel.buffer.readBytesTo(data, channel.buffer.getSize());
			channel._partialRecord = false;
		}			

		//spike.debug('Received buffer: %s', payload);

		// Read received data and reset (SEEK)
		if ((typeof payload) == 'string') {
			data.writeBase64(payload);
		} else if(spike.binarySupport) {
			data.writeBytes(new Uint8Array(payload));
		} else {
			var buff = new Uint8Array(payload);
			for(var i=0; i<buff.byteLength; ++i)
				data.writeByte(buff[i]);
		}
		
		data.position = 0;
		
		// While we have data to read
		while(data.position < data.getSize())
		{
			if(data.getSize() - data.position < sizeOfLen)
			{
				// Read the partial packet 
				channel.buffer = new spike.ByteArray();
				data.readBytesTo(channel.buffer, data.getSize() - data.position);
				channel._partialRecord = true;
				break;
			} 
			
			var length = data.readInt(32, false) + sizeOfLen;
			data.position -= sizeOfLen;
			
		    // If we have enough data to form a full packet.
		    if(length <= (data.getSize() - data.position))
		    {
				// Read the operation and read the actual message into a new buffer
				var messageLength = data.readInt(32, false); // UNUSED
				var operation = "";
				for (var i=0; i < sizeOfKey; i++)
				{
					var byte = data.readInt(8, false);
					var sbyte = byte.toString(16);
					if(sbyte.length == 1)
						sbyte = "0" + sbyte;
					operation += sbyte;
				}
				operation = operation.toUpperCase();
				//spike.debug('Operation #%s received', operation);

				// New buffer for the packet
				var packet = new spike.ByteArray();
				data.readBytesTo(packet, length - sizeTotal);
				packet.position = 0;
		
				// Create the reader and fire the event
				var reader = new spike.PacketReader(packet);
				channel.onReceive(operation, reader);
	
		    }
		    else 
		    {
		     	// Read the partial packet
				channel.buffer = new spike.ByteArray();
				data.readBytesTo(channel.buffer, data.getSize() - data.position);
				channel._partialRecord = true;
		    }
		
		}
	});

	return this;
};


/**
* Close the current socket.
*
* @api public
*/
spike.Channel.prototype.close = 
spike.Channel.prototype.disconnect = function(){
	this.skipReconnect = true;
	this.readyState = 'closed';
	this.socket && this.socket.close();
};

/**
* Called upon transport open.
*
* @api private
*/
spike.Channel.prototype.onopen = function(){
	this.readyState = 'open';

	if (this.onConnect != null)
		this.onConnect();
	
	this.emit('connect');
	this.emit('open');
};

/**
* Called upon engine close.
*
* @api private
*/
spike.Channel.prototype.onclose = function(reason){
	spike.debug('socket closed: %s', reason);
	this.backoff.reset();
	this.readyState = 'closed';
	this.emit('close', reason);
	if (this._reconnection && !this.skipReconnect) {
		this.reconnect();
	}
};

/**
 * Initialize backoff timer with `opts`.
 *
 * - `min` initial timeout in milliseconds [100]
 * - `max` max timeout [10000]
 * - `jitter` [0]
 * - `factor` [2]
 *
 * @param {Object} opts
 * @api public
 */
spike.Backoff = function(opts){
  opts = opts || {};
  this.ms = opts.min || 100;
  this.max = opts.max || 10000;
  this.factor = opts.factor || 2;
  this.jitter = opts.jitter > 0 && opts.jitter <= 1 ? opts.jitter : 0;
  this.attempts = 0;
};

/**
 * Return the backoff duration.
 *
 * @return {Number}
 * @api public
 */
spike.Backoff.prototype.duration = function(){
  var ms = this.ms * Math.pow(this.factor, this.attempts++);
  if (this.jitter) {
    var rand =  Math.random();
    var deviation = Math.floor(rand * this.jitter * ms);
    ms = (Math.floor(rand * 10) & 1) == 0  ? ms - deviation : ms + deviation;
  }
  return Math.min(ms, this.max) | 0;
};

/**
 * Reset the number of attempts.
 *
 * @api public
 */
spike.Backoff.prototype.reset = function(){
  this.attempts = 0;
};

/**
 * Set the minimum duration
 *
 * @api public
 */
spike.Backoff.prototype.setMin = function(min){
  this.ms = min;
};

/**
 * Set the maximum duration
 *
 * @api public
 */
spike.Backoff.prototype.setMax = function(max){
  this.max = max;
};

/**
 * Set the jitter
 *
 * @api public
 */
spike.Backoff.prototype.setJitter = function(jitter){
  this.jitter = jitter;
};


/**
* Called upon successful reconnect.
*
* @api private
*/
spike.Channel.prototype.onreconnect = function(){
	var attempt = this.backoff.attempts;
	this.reconnecting = false;
	this.backoff.reset();
	this.emit('reconnect', attempt);
};

/**
* Sets the `reconnection` config.
*
* @param {Boolean} true/false if it should automatically reconnect
* @return {Manager} self or value
* @api public
*/
spike.Channel.prototype.reconnection = function(v){
	if (!arguments.length) return this._reconnection;
	this._reconnection = !!v;
	return this;
};

/**
* Sets the reconnection attempts config.
*
* @param {Number} max reconnection attempts before giving up
* @return {Manager} self or value
* @api public
*/
spike.Channel.prototype.reconnectionAttempts = function(v){
	if (!arguments.length) return this._reconnectionAttempts;
	this._reconnectionAttempts = v;
	return this;
};

/**
* Sets the delay between reconnections.
*
* @param {Number} delay
* @return {Manager} self or value
* @api public
*/
spike.Channel.prototype.reconnectionDelay = function(v){
	if (!arguments.length) return this._reconnectionDelay;
	this._reconnectionDelay = v;
	this.backoff && this.backoff.setMin(v);
	return this;
};
spike.Channel.prototype.randomizationFactor = function(v){
	if (!arguments.length) return this._randomizationFactor;
	this._randomizationFactor = v;
	this.backoff && this.backoff.setJitter(v);
	return this;
};

/**
* Sets the maximum delay between reconnections.
*
* @param {Number} delay
* @return {Manager} self or value
* @api public
*/
spike.Channel.prototype.reconnectionDelayMax = function(v){
	if (!arguments.length) return this._reconnectionDelayMax;
	this._reconnectionDelayMax = v;
	this.backoff && this.backoff.setMax(v);
	return this;
};

/**
* Sets the connection timeout. `false` to disable
*
* @return {Manager} self or value
* @api public
*/
spike.Channel.prototype.timeout = function(v){
	if (!arguments.length) return this._timeout;
	this._timeout = v;
	return this;
};

/**
* Starts trying to reconnect if reconnection is enabled and we have not
* started reconnecting yet
*
* @api private
*/
spike.Channel.prototype.maybeReconnectOnOpen = function() {
	// Only try to reconnect if it's the first time we're connecting
	if (!this.reconnecting && this._reconnection && this.backoff.attempts === 0) {
		// keeps reconnection from firing twice for the same reconnection loop
		this.reconnect();
	}
};

/**
 * Attempt a reconnection.
 *
 * @api private
 */
spike.Channel.prototype.reconnect = function(){
  if (this.reconnecting || this.skipReconnect) return this;

  var self = this;

  if (this.backoff.attempts >= this._reconnectionAttempts) {
    spike.debug('reconnect failed');
    this.backoff.reset();
    this.emit('reconnect_failed');
    this.reconnecting = false;
  } else {
    var delay = this.backoff.duration();
    spike.debug('will wait %dms before reconnect attempt', delay);

    this.reconnecting = true;
    var timer = setTimeout(function(){
      if (self.skipReconnect)
		return;

      spike.debug('attempting reconnect');
      self.emit('reconnect_attempt', self.backoff.attempts);
      self.emit('reconnecting', self.backoff.attempts);

      // check again for the case socket closed in above events
      if (self.skipReconnect) return;

      self.open(function(err){
        if (err) {
          spike.debug('reconnect attempt error, %s', err);
          self.reconnecting = false;
          self.reconnect();
          self.emit('reconnect_error', err.data);
        } else {
          spike.debug('reconnect success');
          self.onreconnect();
        }
      });
    }, delay);

  }
};


/* Mix in 'Emitter' */
spike.Emitter(spike.Channel.prototype);

/* Backwards compatibility and alias*/
spike.ServerChannel = spike.Channel;
spike.TcpChannel = spike.Channel; 
