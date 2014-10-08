function ByteArray(data){
	
	/* The buffer containing the byte data */
	this.data = data;
	
	/* Current position in the buffer */
	this.position = 0;

	/* By default: use big endian */
	this.bigEndian = true;

	/* By default: allow exceptions */
	this.allowExceptions = true;
};
with({p: ByteArray.prototype}){

	/* Writes a floating-point value to the underlying buffer. */
	p.writeFloat = function(number, precisionBits, exponentBits){
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

	/* Writes a integral value to the underlying buffer. */
	p.writeInt = function(number, bits, signed){
		var max = Math.pow(2, bits), r = [];
		(number >= max || number < -(max >> 1)) && this.warn('encodeInt::overflow') && (number = 0);
		number < 0 && (number += max);
		for(; number; r[r.length] = String.fromCharCode(number % 256), number = Math.floor(number / 256));
		for(bits = -(-bits >> 3) - r.length; bits--; r[r.length] = '\0');
		this.data += (this.bigEndian ? r.reverse() : r).join('');
	};

	/* Writes an unsigned byte value to the underlying buffer. */
	p.writeByte = function(number){
		this.writeInt(number, 8, false);
	};

	/* Writes bytes to the underlying buffer. */
	p.writeBytes = function(bytes){
		this.data += bytes;
	};

	/* Reads a floating-point value from the underlying buffer. */
	p.readFloat = function(precisionBits, exponentBits){
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

	/* Reads an integral value from the underlying buffer. */
	p.readInt = function(bits, signed){
		var blen = bits / 8;
		var data = this.data.slice(this.position, this.position + blen);
		this.position += blen;
		var b = new this.Buffer(this.bigEndian, data), x = b.readBits(0, bits), max = Math.pow(2, bits);
		return signed && x >= max / 2 ? x - max : x;
	};

	/* Reads an unsigned byte value from the underlying buffer. */
	p.readByte = function(){
		return this.readInt(8, false);
	};

	/* Reads bytes from the underlying buffer. */
	p.readBytes = function(count){
		var r = this.data.slice(this.position, this.position + count);
		this.position += count;
		return r;
	};

	/* Gets a byte value on a specified position */
	p.getAt = function(index){
		return this.data.charCodeAt(index) & 0xff;
	};

	/* Appends the underlying buffer data to the specified buffer. */
	p.readBytesTo = function(targetBuffer, count){
		targetBuffer.data += this.data.slice(this.position, this.position + count);
		this.position += count;
	};

	/* Appends the underlying buffer data to the specified buffer. */
	p.getSize = function(){
		return this.data.length;
	};

	/* Gets the byte array data as base64 encoded string */
	p.toBase64 = function(){
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

	/* Writes base 64 encoded string to the buffer after decoding it */
	p.writeBase64 = function(input){
		if (typeof(atob) === 'function') {
			this.writeBytes(atob(input));
		} else {
			this.writeBytes(this._atob(input));
		}
	};

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
			//shl fix: Henri Torgemane ~1996 (compressed by Jonas Raoni)
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

}

/*
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


/* JavaScript LibLZF Compressor, a very small data compression library. The compression algorithm is extremely fast. */
function LZF()
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
		
		var output = new ByteArray([]);
		
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
		var iidx = 0;
		var oidx = 0;
		var output = new ByteArray([]);

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
	
}
function PacketReader(byteArray){

    /* The buffer to read */
    this.buffer = byteArray;

    this.decompress = function(){
		this.buffer = new LZF().decompress(this.buffer, this.buffer.getSize());
		this.buffer.position = 0;
    }

    this.readBoolean = function(){
		return this.buffer.readInt(8, false) == 1;
    }

    this.readByte = function(){
        return this.buffer.readInt(8, false);
    }

    this.readSByte = function(){
        return this.buffer.readInt(8, true);
    }

    this.readInt16 = function(){
        return this.buffer.readInt(16, true);
    }

    this.readInt32 = function(){
        return this.buffer.readInt(32, true);
    }

    this.readInt64 = function(){
        return this.buffer.readInt(64, true);
    }

    this.readUInt16 = function(){
        return this.buffer.readInt(16, false);
    }

    this.readUInt32 = function(){
        return this.buffer.readInt(32, false);
    }

    this.readUInt64 = function(){
        return this.buffer.readInt(64, false);
    }

    this.readDateTime = function(){
		var year = this.readInt16();
		var month = this.readInt16() - 1;
		var date = this.readInt16();
		var hour = this.readInt16();
		var minute = this.readInt16();
		var second = this.readInt16();
		var millisecond = this.readInt16();
			
		return new Date(year,month,date,hour,minute,second,millisecond);
    }

    this.readSingle = function(){
        return this.buffer.readFloat(23, 8);
    }

    this.readDouble = function(){
        return this.buffer.readFloat(52, 11);
    }

	this.readString = function(){
		var length = this.readInt32();
		if(length > 0){
		    return decodeURIComponent(escape(this.buffer.readBytes(length)));
		}
		else{
			return '';
		}
	}

    this.readDynamic = function(){
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

    this.readPacket = function(value){
		value.read(this);
		return value;
    }

    this.readEntity = function(value){
		value.read(this);
		return value;
    }

    this.readByteArray = function(){
		var len = this.readInt32();
		return new ByteArray(this.buffer.readBytes(len));
    }

    this.readArrayOfEntity = function(className){
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

	this.readArrayOfUInt16 = function(){
		var length = this.readInt32();
		var resultArray = new Array();
		
		for(var i = 0; i < length; ++i)
			resultArray.push( this.readUInt16() );
			
		return resultArray;
    }

	this.readArrayOfInt16 = function(){
		var length = this.readInt32();
		var resultArray = new Array();
		
		for(var i = 0; i < length; ++i)
			resultArray.push( this.readInt16() );
			
		return resultArray;
    }

	this.readArrayOfUInt32 = function(){
		var length = this.readInt32();
		var resultArray = new Array();
		
		for(var i = 0; i < length; ++i)
			resultArray.push( this.readUInt32() );
			
		return resultArray;
    }

	this.readArrayOfInt32 = function(){
		var length = this.readInt32();
		var resultArray = new Array();
		
		for(var i = 0; i < length; ++i)
			resultArray.push( this.readInt32() );
			
		return resultArray;
    }

	this.readArrayOfUInt64 = function(){
		var length = this.readInt32();
		var resultArray = new Array();
		
		for(var i = 0; i < length; ++i)
			resultArray.push( this.readUInt64() );
			
		return resultArray;
    }

	this.readArrayOfInt64 = function(){
		var length = this.readInt32();
		var resultArray = new Array();
		
		for(var i = 0; i < length; ++i)
			resultArray.push( this.readInt64() );
			
		return resultArray;
    }

	this.readArrayOfSingle = function(){
		var length = this.readInt32();
		var resultArray = new Array();
		
		for(var i = 0; i < length; ++i)
			resultArray.push( this.readSingle() );
			
		return resultArray;
    }

	this.readArrayOfDouble = function(){
		var length = this.readInt32();
		var resultArray = new Array();
		
		for(var i = 0; i < length; ++i)
			resultArray.push( this.readDouble() );
			
		return resultArray;
    }

	this.readArrayOfBoolean = function(){
		var length = this.readInt32();
		var resultArray = new Array();
		
		for(var i = 0; i < length; ++i)
			resultArray.push( this.readBoolean() );
			
		return resultArray;
    }

	this.readArrayOfDateTime = function(){
		var length = this.readInt32();
		var resultArray = new Array();
		
		for(var i = 0; i < length; ++i)
			resultArray.push( this.readDateTime() );
			
		return resultArray;
    }

	this.readArrayOfString = function(){
		var length = this.readInt32();
		var resultArray = new Array();
		
		for(var i = 0; i < length; ++i)
			resultArray.push( this.readString() );
			
		return resultArray;
    }

	this.readArrayOfDynamic = function(){
		var length = this.readInt32();
		var resultArray = new Array();
		
		for(var i = 0; i < length; ++i)
			resultArray.push( this.readDynamic() );
			
		return resultArray;
    }

}
function PacketWriter(bufferTowrite){

	/* The buffer to write to */
	this.buffer = new ByteArray([]);

	/* Compresses the packet */
	this.compress = function()
	{			
		this.buffer = new LZF().compress(this.buffer, this.buffer.getSize());
	}	
	
	this.writeBoolean = function(value){
		if(value){
			this.buffer.writeInt(1, 8, false);
		}else{
			this.buffer.writeInt(0, 8, false);
		}
	}
	
	this.writeKey = function(value){
		for(var i=0; i < 8; i+=2)
		{
			var s = value.charAt(i) + value.charAt(i + 1);
			var b = parseInt(s, 16);
			this.buffer.writeInt(b, 8, false);
		}
	}

	this.writeByte = function(value){
		this.buffer.writeInt(value, 8, false);
	}
	
	this.writeSByte = function(value){
		this.buffer.writeInt(value, 8, true);
	}
	
	this.writeInt16 = function(value){
		this.buffer.writeInt(value, 16, true);
	}
	
	this.writeInt32 = function(value){
		this.buffer.writeInt(value, 32, true);
	}
	
	this.writeInt64 = function(value){
		this.buffer.writeInt(value, 64, true);
	}
	
	this.writeUInt16 = function(value){
		this.buffer.writeInt(value, 16, false);
	}
	
	this.writeUInt32 = function(value){
		this.buffer.writeInt(value, 32, false);
	}
	
	this.writeUInt64 = function(value){
		this.buffer.writeInt(value, 64, false);
	}

	this.writeDateTime = function(value){
		this.writeInt16(value.getFullYear());
		this.writeInt16(value.getMonth() + 1);
		this.writeInt16(value.getDate());
		this.writeInt16(value.getHours());
		this.writeInt16(value.getMinutes());
		this.writeInt16(value.getSeconds());
		this.writeInt16(value.getMilliseconds());
	}

	this.writeSingle = function(value){
		this.buffer.writeFloat(value, 23, 8);
	}
	
	this.writeDouble = function(value){
		this.buffer.writeFloat(value, 52, 11);
	}
	
	this.writeString = function(value){
		if(value == 'undefined' || value == null || value.length == 0){
			this.writeInt32(0);		
		}else{
		    value = unescape(encodeURIComponent(value));
		    this.writeInt32(value.length);
		    this.buffer.writeBytes(value);
		}
	}

	this.writePacket = function(value){
		value.write(this);
	}

	this.writeEntity = function(value){
		value.write(this);
	}

	this.writeDynamic = function(value){
		var type = typeof(value);
		if(type == "number")
		{
			this.writeByte(1);
			this.writeString("Double");
			this.writeDouble(value);
		}
		else if(type == "boolean")
		{
			this.writeByte(1);
			this.writeString("Boolean");
			this.writeBoolean(value);
		}
		else if(type == "string")
		{
			this.writeByte(1);
			this.writeString("String");
			this.writeString(value);
		}
		else if(type == "object" && value instanceof Date)
		{
			this.writeByte(1);
			this.writeString("DateTime");
			this.writeDateTime(value);
		}
		else
		{
			this.writeByte(0);
		}
	}

	this.writeByteArray = function(value){
		var type = typeof(value);
		if(type == "object" && value instanceof ByteArray){
			this.writeInt32(value.getSize());
			this.buffer.writeBytes(value.data);
		}else{
			this.writeInt32(value.length);
			this.buffer.writeBytes(value);
		}
	}

	this.writeArrayOfUInt16 = function(value){
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

	this.writeArrayOfInt16 = function(value){
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

	this.writeArrayOfInt32 = function(value){
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

	this.writeArrayOfUInt32 = function(value){
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

	this.writeArrayOfInt64 = function(value){
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

	this.writeArrayOfUInt64 = function(value){
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

	this.writeArrayOfDouble = function(value){
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

	this.writeArrayOfSingle = function(value){
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

	this.writeArrayOfDateTime = function(value){
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

	this.writeArrayOfString = function(value){
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

	this.writeArrayOfBoolean = function(value){
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

	this.writeArrayOfDynamic = function(value){
		var type = typeof(value);
		if(type == "object" && value instanceof Array){
			this.writeInt32(value.length);
			if(value.length == 0)
				return;
			for(var i=0; i<value.length; ++i){
				this.writeDynamic(value[i]);
			}
		}else{
			this.writeInt32(0);
		}
	}

	this.writeArray = function(value){
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


}
function ServerSocket(channel){

	/* ServerChannel */
	this.channel = channel;

	/* Server EndPoint url */
	this.endPoint = channel.endPoint;

	/* Reception buffer */
	this.buffer = new ByteArray([]);

	/* Partial record flag */
	this.partialRecord = false;

	/* 'Socket' object to use for all communication*/
	this.socket = io.connect(this.endPoint);
	this.socket.serverSocket = this;
	this.socket.socket.serverSocket = this;

	/* Socket transport currently used */
	this.transport = "";

	/* Connect event function */
	this.channel.onConnect = function(eventHandler){ 
		var toCall = eventHandler;
		this.socket.socket.on('connect', function(){  
			this.serverSocket.transport = this.socket.transport.name;
			toCall(); 
		});
	};

	/* Disconnect event function */
	this.channel.onDisconnect = function(eventHandler){ 
		var toCall = eventHandler;
		this.socket.socket.on('disconnect', function(){  
			toCall(); 
		});
	};

	/* Sends the data to the remote endpoint */
	this.send = function(operationKey, packet) {
		// Initialize size variables
		var sizeOfKey = 4;
		var sizeOfLen = 4;
		var sizeTotal = 8;

		// Writes the length of the packet, the operation and the data
		var length   = packet == null ? 0 : packet.buffer.data.length;
		var compiled = new PacketWriter();

		// Write the length of the packet
		compiled.writeUInt32(length + sizeOfKey);

		// Write the key of the packet
		compiled.writeKey(operationKey);
	
		// Write the body
		if(length > 0){
			compiled.buffer.writeBytes(packet.buffer.data);
		}

		// Send the payload in base64
		this.socket.send( compiled.buffer.toBase64() );
	};

	/* Invoked when the socked receives incoming data */
	this.socket.on('message', function(payload) {
		// Initialize size variables
		var sizeOfKey = 4;
		var sizeOfLen = 4;
		var sizeTotal = 8;

		var data = new ByteArray([]);
		var socket = this.serverSocket;
		if(socket.partialRecord)
		{
			socket.buffer.readBytesTo(data, socket.buffer.getSize());
			socket.partialRecord = false;
		}			

		// Read received data
		data.writeBase64(payload);

		// While we have data to read
		while(data.position < data.getSize())
		{
			if(data.getSize() - data.position < sizeOfLen)
			{
				// Read the partial packet 
				socket.buffer = new ByteArray([]);
				data.readBytesTo(socket.buffer, data.getSize() - data.position);
				socket.partialRecord = true;
				break;
			} 
			
			var Length = data.readInt(32, false) + sizeOfLen;
			data.position -= sizeOfLen;
			
		    // If we have enough data to form a full packet.
		    if(Length <= (data.getSize() - data.position))
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

				// New buffer for the packet
				var packet = new ByteArray([]);
				data.readBytesTo(packet, Length - sizeTotal);
				packet.position = 0;
		
				// Create the reader and fire the event
				if(socket.channel != 'undefined' && socket.channel != null && socket.channel.onReceive != 'undefined' && socket.channel.onReceive != null)
				{
					var reader = new PacketReader(packet);
					socket.channel.onReceive(operation, reader);
				}
		    }
		    else 
		    {
		     	// Read the partial packet
				socket.buffer = new ByteArray([]);
				data.readBytesTo(socket.buffer, data.getSize() - data.position);
				socket.partialRecord = true;
		    }
		
		}

	});


}
/*! Socket.IO.js build:0.9.11, development. Copyright(c) 2011 LearnBoost <dev@learnboost.com> MIT Licensed */

var io = ('undefined' === typeof module ? {} : module.exports);
(function() {

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, global) {

  /**
   * IO namespace.
   *
   * @namespace
   */

  var io = exports;

  /**
   * Socket.IO version
   *
   * @api public
   */

  io.version = '0.9.11';

  /**
   * Protocol implemented.
   *
   * @api public
   */

  io.protocol = 1;

  /**
   * Available transports, these will be populated with the available transports
   *
   * @api public
   */

  io.transports = [];

  /**
   * Keep track of jsonp callbacks.
   *
   * @api private
   */

  io.j = [];

  /**
   * Keep track of our io.Sockets
   *
   * @api private
   */
  io.sockets = {};


  /**
   * Manages connections to hosts.
   *
   * @param {String} uri
   * @Param {Boolean} force creation of new socket (defaults to false)
   * @api public
   */

  io.connect = function (host, details) {
    var uri = io.util.parseUri(host)
      , uuri
      , socket;

    if (global && global.location) {
      uri.protocol = uri.protocol || global.location.protocol.slice(0, -1);
      uri.host = uri.host || (global.document
        ? global.document.domain : global.location.hostname);
      uri.port = uri.port || global.location.port;
    }

    uuri = io.util.uniqueUri(uri);

    var options = {
        host: uri.host
      , secure: 'https' == uri.protocol
      , port: uri.port || ('https' == uri.protocol ? 443 : 80)
      , query: uri.query || ''
    };

    io.util.merge(options, details);

    if (options['force new connection'] || !io.sockets[uuri]) {
      socket = new io.Socket(options);
    }

    if (!options['force new connection'] && socket) {
      io.sockets[uuri] = socket;
    }

    socket = socket || io.sockets[uuri];

    // if path is different from '' or /
    return socket.of(uri.path.length > 1 ? uri.path : '');
  };

})('object' === typeof module ? module.exports : (this.io = {}), this);
/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, global) {

  /**
   * Utilities namespace.
   *
   * @namespace
   */

  var util = exports.util = {};

  /**
   * Parses an URI
   *
   * @author Steven Levithan <stevenlevithan.com> (MIT license)
   * @api public
   */

  var re = /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;

  var parts = ['source', 'protocol', 'authority', 'userInfo', 'user', 'password',
               'host', 'port', 'relative', 'path', 'directory', 'file', 'query',
               'anchor'];

  util.parseUri = function (str) {
    var m = re.exec(str || '')
      , uri = {}
      , i = 14;

    while (i--) {
      uri[parts[i]] = m[i] || '';
    }

    return uri;
  };

  /**
   * Produces a unique url that identifies a Socket.IO connection.
   *
   * @param {Object} uri
   * @api public
   */

  util.uniqueUri = function (uri) {
    var protocol = uri.protocol
      , host = uri.host
      , port = uri.port;

    if ('document' in global) {
      host = host || document.domain;
      port = port || (protocol == 'https'
        && document.location.protocol !== 'https:' ? 443 : document.location.port);
    } else {
      host = host || 'localhost';

      if (!port && protocol == 'https') {
        port = 443;
      }
    }

    return (protocol || 'http') + '://' + host + ':' + (port || 80);
  };

  /**
   * Mergest 2 query strings in to once unique query string
   *
   * @param {String} base
   * @param {String} addition
   * @api public
   */

  util.query = function (base, addition) {
    var query = util.chunkQuery(base || '')
      , components = [];

    util.merge(query, util.chunkQuery(addition || ''));
    for (var part in query) {
      if (query.hasOwnProperty(part)) {
        components.push(part + '=' + query[part]);
      }
    }

    return components.length ? '?' + components.join('&') : '';
  };

  /**
   * Transforms a querystring in to an object
   *
   * @param {String} qs
   * @api public
   */

  util.chunkQuery = function (qs) {
    var query = {}
      , params = qs.split('&')
      , i = 0
      , l = params.length
      , kv;

    for (; i < l; ++i) {
      kv = params[i].split('=');
      if (kv[0]) {
        query[kv[0]] = kv[1];
      }
    }

    return query;
  };

  /**
   * Executes the given function when the page is loaded.
   *
   *     io.util.load(function () { console.log('page loaded'); });
   *
   * @param {Function} fn
   * @api public
   */

  var pageLoaded = false;

  util.load = function (fn) {
    if ('document' in global && document.readyState === 'complete' || pageLoaded) {
      return fn();
    }

    util.on(global, 'load', fn, false);
  };

  /**
   * Adds an event.
   *
   * @api private
   */

  util.on = function (element, event, fn, capture) {
    if (element.attachEvent) {
      element.attachEvent('on' + event, fn);
    } else if (element.addEventListener) {
      element.addEventListener(event, fn, capture);
    }
  };

  /**
   * Generates the correct `XMLHttpRequest` for regular and cross domain requests.
   *
   * @param {Boolean} [xdomain] Create a request that can be used cross domain.
   * @returns {XMLHttpRequest|false} If we can create a XMLHttpRequest.
   * @api private
   */

  util.request = function (xdomain) {

    if (xdomain && 'undefined' != typeof XDomainRequest && !util.ua.hasCORS) {
      return new XDomainRequest();
    }

    if ('undefined' != typeof XMLHttpRequest && (!xdomain || util.ua.hasCORS)) {
      return new XMLHttpRequest();
    }

    if (!xdomain) {
      try {
        return new window[(['Active'].concat('Object').join('X'))]('Microsoft.XMLHTTP');
      } catch(e) { }
    }

    return null;
  };

  /**
   * XHR based transport constructor.
   *
   * @constructor
   * @api public
   */

  /**
   * Change the internal pageLoaded value.
   */

  if ('undefined' != typeof window) {
    util.load(function () {
      pageLoaded = true;
    });
  }

  /**
   * Defers a function to ensure a spinner is not displayed by the browser
   *
   * @param {Function} fn
   * @api public
   */

  util.defer = function (fn) {
    if (!util.ua.webkit || 'undefined' != typeof importScripts) {
      return fn();
    }

    util.load(function () {
      setTimeout(fn, 100);
    });
  };

  /**
   * Merges two objects.
   *
   * @api public
   */

  util.merge = function merge (target, additional, deep, lastseen) {
    var seen = lastseen || []
      , depth = typeof deep == 'undefined' ? 2 : deep
      , prop;

    for (prop in additional) {
      if (additional.hasOwnProperty(prop) && util.indexOf(seen, prop) < 0) {
        if (typeof target[prop] !== 'object' || !depth) {
          target[prop] = additional[prop];
          seen.push(additional[prop]);
        } else {
          util.merge(target[prop], additional[prop], depth - 1, seen);
        }
      }
    }

    return target;
  };

  /**
   * Merges prototypes from objects
   *
   * @api public
   */

  util.mixin = function (ctor, ctor2) {
    util.merge(ctor.prototype, ctor2.prototype);
  };

  /**
   * Shortcut for prototypical and static inheritance.
   *
   * @api private
   */

  util.inherit = function (ctor, ctor2) {
    function f() {};
    f.prototype = ctor2.prototype;
    ctor.prototype = new f;
  };

  /**
   * Checks if the given object is an Array.
   *
   *     io.util.isArray([]); // true
   *     io.util.isArray({}); // false
   *
   * @param Object obj
   * @api public
   */

  util.isArray = Array.isArray || function (obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
  };

  /**
   * Intersects values of two arrays into a third
   *
   * @api public
   */

  util.intersect = function (arr, arr2) {
    var ret = []
      , longest = arr.length > arr2.length ? arr : arr2
      , shortest = arr.length > arr2.length ? arr2 : arr;

    for (var i = 0, l = shortest.length; i < l; i++) {
      if (~util.indexOf(longest, shortest[i]))
        ret.push(shortest[i]);
    }

    return ret;
  };

  /**
   * Array indexOf compatibility.
   *
   * @see bit.ly/a5Dxa2
   * @api public
   */

  util.indexOf = function (arr, o, i) {

    for (var j = arr.length, i = i < 0 ? i + j < 0 ? 0 : i + j : i || 0;
         i < j && arr[i] !== o; i++) {}

    return j <= i ? -1 : i;
  };

  /**
   * Converts enumerables to array.
   *
   * @api public
   */

  util.toArray = function (enu) {
    var arr = [];

    for (var i = 0, l = enu.length; i < l; i++)
      arr.push(enu[i]);

    return arr;
  };

  /**
   * UA / engines detection namespace.
   *
   * @namespace
   */

  util.ua = {};

  /**
   * Whether the UA supports CORS for XHR.
   *
   * @api public
   */

  util.ua.hasCORS = 'undefined' != typeof XMLHttpRequest && (function () {
    try {
      var a = new XMLHttpRequest();
    } catch (e) {
      return false;
    }

    return a.withCredentials != undefined;
  })();

  /**
   * Detect webkit.
   *
   * @api public
   */

  util.ua.webkit = 'undefined' != typeof navigator
    && /webkit/i.test(navigator.userAgent);

   /**
   * Detect iPad/iPhone/iPod.
   *
   * @api public
   */

  util.ua.iDevice = 'undefined' != typeof navigator
      && /iPad|iPhone|iPod/i.test(navigator.userAgent);

})('undefined' != typeof io ? io : module.exports, this);
/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Expose constructor.
   */

  exports.EventEmitter = EventEmitter;

  /**
   * Event emitter constructor.
   *
   * @api public.
   */

  function EventEmitter () {};

  /**
   * Adds a listener
   *
   * @api public
   */

  EventEmitter.prototype.on = function (name, fn) {
    if (!this.$events) {
      this.$events = {};
    }

    if (!this.$events[name]) {
      this.$events[name] = fn;
    } else if (io.util.isArray(this.$events[name])) {
      this.$events[name].push(fn);
    } else {
      this.$events[name] = [this.$events[name], fn];
    }

    return this;
  };

  EventEmitter.prototype.addListener = EventEmitter.prototype.on;

  /**
   * Adds a volatile listener.
   *
   * @api public
   */

  EventEmitter.prototype.once = function (name, fn) {
    var self = this;

    function on () {
      self.removeListener(name, on);
      fn.apply(this, arguments);
    };

    on.listener = fn;
    this.on(name, on);

    return this;
  };

  /**
   * Removes a listener.
   *
   * @api public
   */

  EventEmitter.prototype.removeListener = function (name, fn) {
    if (this.$events && this.$events[name]) {
      var list = this.$events[name];

      if (io.util.isArray(list)) {
        var pos = -1;

        for (var i = 0, l = list.length; i < l; i++) {
          if (list[i] === fn || (list[i].listener && list[i].listener === fn)) {
            pos = i;
            break;
          }
        }

        if (pos < 0) {
          return this;
        }

        list.splice(pos, 1);

        if (!list.length) {
          delete this.$events[name];
        }
      } else if (list === fn || (list.listener && list.listener === fn)) {
        delete this.$events[name];
      }
    }

    return this;
  };

  /**
   * Removes all listeners for an event.
   *
   * @api public
   */

  EventEmitter.prototype.removeAllListeners = function (name) {
    if (name === undefined) {
      this.$events = {};
      return this;
    }

    if (this.$events && this.$events[name]) {
      this.$events[name] = null;
    }

    return this;
  };

  /**
   * Gets all listeners for a certain event.
   *
   * @api publci
   */

  EventEmitter.prototype.listeners = function (name) {
    if (!this.$events) {
      this.$events = {};
    }

    if (!this.$events[name]) {
      this.$events[name] = [];
    }

    if (!io.util.isArray(this.$events[name])) {
      this.$events[name] = [this.$events[name]];
    }

    return this.$events[name];
  };

  /**
   * Emits an event.
   *
   * @api public
   */

  EventEmitter.prototype.emit = function (name) {
    if (!this.$events) {
      return false;
    }

    var handler = this.$events[name];

    if (!handler) {
      return false;
    }

    var args = Array.prototype.slice.call(arguments, 1);

    if ('function' == typeof handler) {
      handler.apply(this, args);
    } else if (io.util.isArray(handler)) {
      var listeners = handler.slice();

      for (var i = 0, l = listeners.length; i < l; i++) {
        listeners[i].apply(this, args);
      }
    } else {
      return false;
    }

    return true;
  };

})(
    'undefined' != typeof io ? io : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

/**
 * Based on JSON2 (http://www.JSON.org/js.html).
 */

(function (exports, nativeJSON) {
  "use strict";

  // use native JSON if it's available
  if (nativeJSON && nativeJSON.parse){
    return exports.JSON = {
      parse: nativeJSON.parse
    , stringify: nativeJSON.stringify
    };
  }

  var JSON = exports.JSON = {};

  function f(n) {
      // Format integers to have at least two digits.
      return n < 10 ? '0' + n : n;
  }

  function date(d, key) {
    return isFinite(d.valueOf()) ?
        d.getUTCFullYear()     + '-' +
        f(d.getUTCMonth() + 1) + '-' +
        f(d.getUTCDate())      + 'T' +
        f(d.getUTCHours())     + ':' +
        f(d.getUTCMinutes())   + ':' +
        f(d.getUTCSeconds())   + 'Z' : null;
  };

  var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
      escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
      gap,
      indent,
      meta = {    // table of character substitutions
          '\b': '\\b',
          '\t': '\\t',
          '\n': '\\n',
          '\f': '\\f',
          '\r': '\\r',
          '"' : '\\"',
          '\\': '\\\\'
      },
      rep;


  function quote(string) {

// If the string contains no control characters, no quote characters, and no
// backslash characters, then we can safely slap some quotes around it.
// Otherwise we must also replace the offending characters with safe escape
// sequences.

      escapable.lastIndex = 0;
      return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
          var c = meta[a];
          return typeof c === 'string' ? c :
              '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
      }) + '"' : '"' + string + '"';
  }


  function str(key, holder) {

// Produce a string from holder[key].

      var i,          // The loop counter.
          k,          // The member key.
          v,          // The member value.
          length,
          mind = gap,
          partial,
          value = holder[key];

// If the value has a toJSON method, call it to obtain a replacement value.

      if (value instanceof Date) {
          value = date(key);
      }

// If we were called with a replacer function, then call the replacer to
// obtain a replacement value.

      if (typeof rep === 'function') {
          value = rep.call(holder, key, value);
      }

// What happens next depends on the value's type.

      switch (typeof value) {
      case 'string':
          return quote(value);

      case 'number':

// JSON numbers must be finite. Encode non-finite numbers as null.

          return isFinite(value) ? String(value) : 'null';

      case 'boolean':
      case 'null':

// If the value is a boolean or null, convert it to a string. Note:
// typeof null does not produce 'null'. The case is included here in
// the remote chance that this gets fixed someday.

          return String(value);

// If the type is 'object', we might be dealing with an object or an array or
// null.

      case 'object':

// Due to a specification blunder in ECMAScript, typeof null is 'object',
// so watch out for that case.

          if (!value) {
              return 'null';
          }

// Make an array to hold the partial results of stringifying this object value.

          gap += indent;
          partial = [];

// Is the value an array?

          if (Object.prototype.toString.apply(value) === '[object Array]') {

// The value is an array. Stringify every element. Use null as a placeholder
// for non-JSON values.

              length = value.length;
              for (i = 0; i < length; i += 1) {
                  partial[i] = str(i, value) || 'null';
              }

// Join all of the elements together, separated with commas, and wrap them in
// brackets.

              v = partial.length === 0 ? '[]' : gap ?
                  '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']' :
                  '[' + partial.join(',') + ']';
              gap = mind;
              return v;
          }

// If the replacer is an array, use it to select the members to be stringified.

          if (rep && typeof rep === 'object') {
              length = rep.length;
              for (i = 0; i < length; i += 1) {
                  if (typeof rep[i] === 'string') {
                      k = rep[i];
                      v = str(k, value);
                      if (v) {
                          partial.push(quote(k) + (gap ? ': ' : ':') + v);
                      }
                  }
              }
          } else {

// Otherwise, iterate through all of the keys in the object.

              for (k in value) {
                  if (Object.prototype.hasOwnProperty.call(value, k)) {
                      v = str(k, value);
                      if (v) {
                          partial.push(quote(k) + (gap ? ': ' : ':') + v);
                      }
                  }
              }
          }

// Join all of the member texts together, separated with commas,
// and wrap them in braces.

          v = partial.length === 0 ? '{}' : gap ?
              '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}' :
              '{' + partial.join(',') + '}';
          gap = mind;
          return v;
      }
  }

// If the JSON object does not yet have a stringify method, give it one.

  JSON.stringify = function (value, replacer, space) {

// The stringify method takes a value and an optional replacer, and an optional
// space parameter, and returns a JSON text. The replacer can be a function
// that can replace values, or an array of strings that will select the keys.
// A default replacer method can be provided. Use of the space parameter can
// produce text that is more easily readable.

      var i;
      gap = '';
      indent = '';

// If the space parameter is a number, make an indent string containing that
// many spaces.

      if (typeof space === 'number') {
          for (i = 0; i < space; i += 1) {
              indent += ' ';
          }

// If the space parameter is a string, it will be used as the indent string.

      } else if (typeof space === 'string') {
          indent = space;
      }

// If there is a replacer, it must be a function or an array.
// Otherwise, throw an error.

      rep = replacer;
      if (replacer && typeof replacer !== 'function' &&
              (typeof replacer !== 'object' ||
              typeof replacer.length !== 'number')) {
          throw new Error('JSON.stringify');
      }

// Make a fake root object containing our value under the key of ''.
// Return the result of stringifying the value.

      return str('', {'': value});
  };

// If the JSON object does not yet have a parse method, give it one.

  JSON.parse = function (text, reviver) {
  // The parse method takes a text and an optional reviver function, and returns
  // a JavaScript value if the text is a valid JSON text.

      var j;

      function walk(holder, key) {

  // The walk method is used to recursively walk the resulting structure so
  // that modifications can be made.

          var k, v, value = holder[key];
          if (value && typeof value === 'object') {
              for (k in value) {
                  if (Object.prototype.hasOwnProperty.call(value, k)) {
                      v = walk(value, k);
                      if (v !== undefined) {
                          value[k] = v;
                      } else {
                          delete value[k];
                      }
                  }
              }
          }
          return reviver.call(holder, key, value);
      }


  // Parsing happens in four stages. In the first stage, we replace certain
  // Unicode characters with escape sequences. JavaScript handles many characters
  // incorrectly, either silently deleting them, or treating them as line endings.

      text = String(text);
      cx.lastIndex = 0;
      if (cx.test(text)) {
          text = text.replace(cx, function (a) {
              return '\\u' +
                  ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
          });
      }

  // In the second stage, we run the text against regular expressions that look
  // for non-JSON patterns. We are especially concerned with '()' and 'new'
  // because they can cause invocation, and '=' because it can cause mutation.
  // But just to be safe, we want to reject all unexpected forms.

  // We split the second stage into 4 regexp operations in order to work around
  // crippling inefficiencies in IE's and Safari's regexp engines. First we
  // replace the JSON backslash pairs with '@' (a non-JSON character). Second, we
  // replace all simple value tokens with ']' characters. Third, we delete all
  // open brackets that follow a colon or comma or that begin the text. Finally,
  // we look to see that the remaining characters are only whitespace or ']' or
  // ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

      if (/^[\],:{}\s]*$/
              .test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
                  .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
                  .replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

  // In the third stage we use the eval function to compile the text into a
  // JavaScript structure. The '{' operator is subject to a syntactic ambiguity
  // in JavaScript: it can begin a block or an object literal. We wrap the text
  // in parens to eliminate the ambiguity.

          j = eval('(' + text + ')');

  // In the optional fourth stage, we recursively walk the new structure, passing
  // each name/value pair to a reviver function for possible transformation.

          return typeof reviver === 'function' ?
              walk({'': j}, '') : j;
      }

  // If the text is not JSON parseable, then a SyntaxError is thrown.

      throw new SyntaxError('JSON.parse');
  };

})(
    'undefined' != typeof io ? io : module.exports
  , typeof JSON !== 'undefined' ? JSON : undefined
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Parser namespace.
   *
   * @namespace
   */

  var parser = exports.parser = {};

  /**
   * Packet types.
   */

  var packets = parser.packets = [
      'disconnect'
    , 'connect'
    , 'heartbeat'
    , 'message'
    , 'json'
    , 'event'
    , 'ack'
    , 'error'
    , 'noop'
  ];

  /**
   * Errors reasons.
   */

  var reasons = parser.reasons = [
      'transport not supported'
    , 'client not handshaken'
    , 'unauthorized'
  ];

  /**
   * Errors advice.
   */

  var advice = parser.advice = [
      'reconnect'
  ];

  /**
   * Shortcuts.
   */

  var JSON = io.JSON
    , indexOf = io.util.indexOf;

  /**
   * Encodes a packet.
   *
   * @api private
   */

  parser.encodePacket = function (packet) {
    var type = indexOf(packets, packet.type)
      , id = packet.id || ''
      , endpoint = packet.endpoint || ''
      , ack = packet.ack
      , data = null;

    switch (packet.type) {
      case 'error':
        var reason = packet.reason ? indexOf(reasons, packet.reason) : ''
          , adv = packet.advice ? indexOf(advice, packet.advice) : '';

        if (reason !== '' || adv !== '')
          data = reason + (adv !== '' ? ('+' + adv) : '');

        break;

      case 'message':
        if (packet.data !== '')
          data = packet.data;
        break;

      case 'event':
        var ev = { name: packet.name };

        if (packet.args && packet.args.length) {
          ev.args = packet.args;
        }

        data = JSON.stringify(ev);
        break;

      case 'json':
        data = JSON.stringify(packet.data);
        break;

      case 'connect':
        if (packet.qs)
          data = packet.qs;
        break;

      case 'ack':
        data = packet.ackId
          + (packet.args && packet.args.length
              ? '+' + JSON.stringify(packet.args) : '');
        break;
    }

    // construct packet with required fragments
    var encoded = [
        type
      , id + (ack == 'data' ? '+' : '')
      , endpoint
    ];

    // data fragment is optional
    if (data !== null && data !== undefined)
      encoded.push(data);

    return encoded.join(':');
  };

  /**
   * Encodes multiple messages (payload).
   *
   * @param {Array} messages
   * @api private
   */

  parser.encodePayload = function (packets) {
    var decoded = '';

    if (packets.length == 1)
      return packets[0];

    for (var i = 0, l = packets.length; i < l; i++) {
      var packet = packets[i];
      decoded += '\ufffd' + packet.length + '\ufffd' + packets[i];
    }

    return decoded;
  };

  /**
   * Decodes a packet
   *
   * @api private
   */

  var regexp = /([^:]+):([0-9]+)?(\+)?:([^:]+)?:?([\s\S]*)?/;

  parser.decodePacket = function (data) {
    var pieces = data.match(regexp);

    if (!pieces) return {};

    var id = pieces[2] || ''
      , data = pieces[5] || ''
      , packet = {
            type: packets[pieces[1]]
          , endpoint: pieces[4] || ''
        };

    // whether we need to acknowledge the packet
    if (id) {
      packet.id = id;
      if (pieces[3])
        packet.ack = 'data';
      else
        packet.ack = true;
    }

    // handle different packet types
    switch (packet.type) {
      case 'error':
        var pieces = data.split('+');
        packet.reason = reasons[pieces[0]] || '';
        packet.advice = advice[pieces[1]] || '';
        break;

      case 'message':
        packet.data = data || '';
        break;

      case 'event':
        try {
          var opts = JSON.parse(data);
          packet.name = opts.name;
          packet.args = opts.args;
        } catch (e) { }

        packet.args = packet.args || [];
        break;

      case 'json':
        try {
          packet.data = JSON.parse(data);
        } catch (e) { }
        break;

      case 'connect':
        packet.qs = data || '';
        break;

      case 'ack':
        var pieces = data.match(/^([0-9]+)(\+)?(.*)/);
        if (pieces) {
          packet.ackId = pieces[1];
          packet.args = [];

          if (pieces[3]) {
            try {
              packet.args = pieces[3] ? JSON.parse(pieces[3]) : [];
            } catch (e) { }
          }
        }
        break;

      case 'disconnect':
      case 'heartbeat':
        break;
    };

    return packet;
  };

  /**
   * Decodes data payload. Detects multiple messages
   *
   * @return {Array} messages
   * @api public
   */

  parser.decodePayload = function (data) {
    // IE doesn't like data[i] for unicode chars, charAt works fine
    if (data.charAt(0) == '\ufffd') {
      var ret = [];

      for (var i = 1, length = ''; i < data.length; i++) {
        if (data.charAt(i) == '\ufffd') {
          ret.push(parser.decodePacket(data.substr(i + 1).substr(0, length)));
          i += Number(length) + 1;
          length = '';
        } else {
          length += data.charAt(i);
        }
      }

      return ret;
    } else {
      return [parser.decodePacket(data)];
    }
  };

})(
    'undefined' != typeof io ? io : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);
/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Expose constructor.
   */

  exports.Transport = Transport;

  /**
   * This is the transport template for all supported transport methods.
   *
   * @constructor
   * @api public
   */

  function Transport (socket, sessid) {
    this.socket = socket;
    this.sessid = sessid;
  };

  /**
   * Apply EventEmitter mixin.
   */

  io.util.mixin(Transport, io.EventEmitter);


  /**
   * Indicates whether heartbeats is enabled for this transport
   *
   * @api private
   */

  Transport.prototype.heartbeats = function () {
    return true;
  };

  /**
   * Handles the response from the server. When a new response is received
   * it will automatically update the timeout, decode the message and
   * forwards the response to the onMessage function for further processing.
   *
   * @param {String} data Response from the server.
   * @api private
   */

  Transport.prototype.onData = function (data) {
    this.clearCloseTimeout();

    // If the connection in currently open (or in a reopening state) reset the close
    // timeout since we have just received data. This check is necessary so
    // that we don't reset the timeout on an explicitly disconnected connection.
    if (this.socket.connected || this.socket.connecting || this.socket.reconnecting) {
      this.setCloseTimeout();
    }

    if (data !== '') {
      // todo: we should only do decodePayload for xhr transports
      var msgs = io.parser.decodePayload(data);

      if (msgs && msgs.length) {
        for (var i = 0, l = msgs.length; i < l; i++) {
          this.onPacket(msgs[i]);
        }
      }
    }

    return this;
  };

  /**
   * Handles packets.
   *
   * @api private
   */

  Transport.prototype.onPacket = function (packet) {
    this.socket.setHeartbeatTimeout();

    if (packet.type == 'heartbeat') {
      return this.onHeartbeat();
    }

    if (packet.type == 'connect' && packet.endpoint == '') {
      this.onConnect();
    }

    if (packet.type == 'error' && packet.advice == 'reconnect') {
      this.isOpen = false;
    }

    this.socket.onPacket(packet);

    return this;
  };

  /**
   * Sets close timeout
   *
   * @api private
   */

  Transport.prototype.setCloseTimeout = function () {
    if (!this.closeTimeout) {
      var self = this;

      this.closeTimeout = setTimeout(function () {
        self.onDisconnect();
      }, this.socket.closeTimeout);
    }
  };

  /**
   * Called when transport disconnects.
   *
   * @api private
   */

  Transport.prototype.onDisconnect = function () {
    if (this.isOpen) this.close();
    this.clearTimeouts();
    this.socket.onDisconnect();
    return this;
  };

  /**
   * Called when transport connects
   *
   * @api private
   */

  Transport.prototype.onConnect = function () {
    this.socket.onConnect();
    return this;
  };

  /**
   * Clears close timeout
   *
   * @api private
   */

  Transport.prototype.clearCloseTimeout = function () {
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }
  };

  /**
   * Clear timeouts
   *
   * @api private
   */

  Transport.prototype.clearTimeouts = function () {
    this.clearCloseTimeout();

    if (this.reopenTimeout) {
      clearTimeout(this.reopenTimeout);
    }
  };

  /**
   * Sends a packet
   *
   * @param {Object} packet object.
   * @api private
   */

  Transport.prototype.packet = function (packet) {
    this.send(io.parser.encodePacket(packet));
  };

  /**
   * Send the received heartbeat message back to server. So the server
   * knows we are still connected.
   *
   * @param {String} heartbeat Heartbeat response from the server.
   * @api private
   */

  Transport.prototype.onHeartbeat = function (heartbeat) {
    this.packet({ type: 'heartbeat' });
  };

  /**
   * Called when the transport opens.
   *
   * @api private
   */

  Transport.prototype.onOpen = function () {
    this.isOpen = true;
    this.clearCloseTimeout();
    this.socket.onOpen();
  };

  /**
   * Notifies the base when the connection with the Socket.IO server
   * has been disconnected.
   *
   * @api private
   */

  Transport.prototype.onClose = function () {
    var self = this;

    /* FIXME: reopen delay causing a infinit loop
    this.reopenTimeout = setTimeout(function () {
      self.open();
    }, this.socket.options['reopen delay']);*/

    this.isOpen = false;
    this.socket.onClose();
    this.onDisconnect();
  };

  /**
   * Generates a connection url based on the Socket.IO URL Protocol.
   * See <https://github.com/learnboost/socket.io-node/> for more details.
   *
   * @returns {String} Connection url
   * @api private
   */

  Transport.prototype.prepareUrl = function () {
    var options = this.socket.options;

    return this.scheme() + '://'
      + options.host + ':' + options.port + '/'
      + options.resource + '/' + io.protocol
      + '/' + this.name + '/' + this.sessid;
  };

  /**
   * Checks if the transport is ready to start a connection.
   *
   * @param {Socket} socket The socket instance that needs a transport
   * @param {Function} fn The callback
   * @api private
   */

  Transport.prototype.ready = function (socket, fn) {
    fn.call(this);
  };
})(
    'undefined' != typeof io ? io : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);
/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io, global) {

  /**
   * Expose constructor.
   */

  exports.Socket = Socket;

  /**
   * Create a new `Socket.IO client` which can establish a persistent
   * connection with a Socket.IO enabled server.
   *
   * @api public
   */

  function Socket (options) {
    this.options = {
        port: 80
      , secure: false
      , document: 'document' in global ? document : false
      , resource: 'socket.io'
      , transports: io.transports
      , 'connect timeout': 10000
      , 'try multiple transports': true
      , 'reconnect': true
      , 'reconnection delay': 500
      , 'reconnection limit': Infinity
      , 'reopen delay': 3000
      , 'max reconnection attempts': 10
      , 'sync disconnect on unload': false
      , 'auto connect': true
      , 'flash policy port': 10843
      , 'manualFlush': false
    };

    io.util.merge(this.options, options);

    this.connected = false;
    this.open = false;
    this.connecting = false;
    this.reconnecting = false;
    this.namespaces = {};
    this.buffer = [];
    this.doBuffer = false;

    if (this.options['sync disconnect on unload'] &&
        (!this.isXDomain() || io.util.ua.hasCORS)) {
      var self = this;
      io.util.on(global, 'beforeunload', function () {
        self.disconnectSync();
      }, false);
    }

    if (this.options['auto connect']) {
      this.connect();
    }
};

  /**
   * Apply EventEmitter mixin.
   */

  io.util.mixin(Socket, io.EventEmitter);

  /**
   * Returns a namespace listener/emitter for this socket
   *
   * @api public
   */

  Socket.prototype.of = function (name) {
    if (!this.namespaces[name]) {
      this.namespaces[name] = new io.SocketNamespace(this, name);

      if (name !== '') {
        this.namespaces[name].packet({ type: 'connect' });
      }
    }

    return this.namespaces[name];
  };

  /**
   * Emits the given event to the Socket and all namespaces
   *
   * @api private
   */

  Socket.prototype.publish = function () {
    this.emit.apply(this, arguments);

    var nsp;

    for (var i in this.namespaces) {
      if (this.namespaces.hasOwnProperty(i)) {
        nsp = this.of(i);
        nsp.$emit.apply(nsp, arguments);
      }
    }
  };

  /**
   * Performs the handshake
   *
   * @api private
   */

  function empty () { };

  Socket.prototype.handshake = function (fn) {
    var self = this
      , options = this.options;

    function complete (data) {
      if (data instanceof Error) {
        self.connecting = false;
        self.onError(data.message);
      } else {
        fn.apply(null, data.split(':'));
      }
    };

    var url = [
          'http' + (options.secure ? 's' : '') + ':/'
        , options.host + ':' + options.port
        , options.resource
        , io.protocol
        , io.util.query(this.options.query, 't=' + +new Date)
      ].join('/');

    if (this.isXDomain() && !io.util.ua.hasCORS) {
      var insertAt = document.getElementsByTagName('script')[0]
        , script = document.createElement('script');

      script.src = url + '&jsonp=' + io.j.length;
      insertAt.parentNode.insertBefore(script, insertAt);

      io.j.push(function (data) {
        complete(data);
        script.parentNode.removeChild(script);
      });
    } else {
      var xhr = io.util.request();

      xhr.open('GET', url, true);
      if (this.isXDomain()) {
        xhr.withCredentials = true;
      }
      xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
          xhr.onreadystatechange = empty;

          if (xhr.status == 200) {
            complete(xhr.responseText);
          } else if (xhr.status == 403) {
            self.onError(xhr.responseText);
          } else {
            self.connecting = false;            
            !self.reconnecting && self.onError(xhr.responseText);
          }
        }
      };
      xhr.send(null);
    }
  };

  /**
   * Find an available transport based on the options supplied in the constructor.
   *
   * @api private
   */

  Socket.prototype.getTransport = function (override) {
    var transports = override || this.transports, match;

    for (var i = 0, transport; transport = transports[i]; i++) {
      if (io.Transport[transport]
        && io.Transport[transport].check(this)
        && (!this.isXDomain() || io.Transport[transport].xdomainCheck(this))) {
        return new io.Transport[transport](this, this.sessionid);
      }
    }

    return null;
  };

  /**
   * Connects to the server.
   *
   * @param {Function} [fn] Callback.
   * @returns {io.Socket}
   * @api public
   */

  Socket.prototype.connect = function (fn) {
    if (this.connecting) {
      return this;
    }

    var self = this;
    self.connecting = true;
    
    this.handshake(function (sid, heartbeat, close, transports) {
      self.sessionid = sid;
      self.closeTimeout = close * 1000;
      self.heartbeatTimeout = heartbeat * 1000;
      if(!self.transports)
          self.transports = self.origTransports = (transports ? io.util.intersect(
              transports.split(',')
            , self.options.transports
          ) : self.options.transports);

      self.setHeartbeatTimeout();

      function connect (transports){
        if (self.transport) self.transport.clearTimeouts();

        self.transport = self.getTransport(transports);
        if (!self.transport) return self.publish('connect_failed');

        // once the transport is ready
        self.transport.ready(self, function () {
          self.connecting = true;
          self.publish('connecting', self.transport.name);
          self.transport.open();

          if (self.options['connect timeout']) {
            self.connectTimeoutTimer = setTimeout(function () {
              if (!self.connected) {
                self.connecting = false;

                if (self.options['try multiple transports']) {
                  var remaining = self.transports;

                  while (remaining.length > 0 && remaining.splice(0,1)[0] !=
                         self.transport.name) {}

                    if (remaining.length){
                      connect(remaining);
                    } else {
                      self.publish('connect_failed');
                    }
                }
              }
            }, self.options['connect timeout']);
          }
        });
      }

      connect(self.transports);

      self.once('connect', function (){
        clearTimeout(self.connectTimeoutTimer);

        fn && typeof fn == 'function' && fn();
      });
    });

    return this;
  };

  /**
   * Clears and sets a new heartbeat timeout using the value given by the
   * server during the handshake.
   *
   * @api private
   */

  Socket.prototype.setHeartbeatTimeout = function () {
    clearTimeout(this.heartbeatTimeoutTimer);
    if(this.transport && !this.transport.heartbeats()) return;

    var self = this;
    this.heartbeatTimeoutTimer = setTimeout(function () {
      self.transport.onClose();
    }, this.heartbeatTimeout);
  };

  /**
   * Sends a message.
   *
   * @param {Object} data packet.
   * @returns {io.Socket}
   * @api public
   */

  Socket.prototype.packet = function (data) {
    if (this.connected && !this.doBuffer) {
      this.transport.packet(data);
    } else {
      this.buffer.push(data);
    }

    return this;
  };

  /**
   * Sets buffer state
   *
   * @api private
   */

  Socket.prototype.setBuffer = function (v) {
    this.doBuffer = v;

    if (!v && this.connected && this.buffer.length) {
      if (!this.options['manualFlush']) {
        this.flushBuffer();
      }
    }
  };

  /**
   * Flushes the buffer data over the wire.
   * To be invoked manually when 'manualFlush' is set to true.
   *
   * @api public
   */

  Socket.prototype.flushBuffer = function() {
    this.transport.payload(this.buffer);
    this.buffer = [];
  };
  

  /**
   * Disconnect the established connect.
   *
   * @returns {io.Socket}
   * @api public
   */

  Socket.prototype.disconnect = function () {
    if (this.connected || this.connecting) {
      if (this.open) {
        this.of('').packet({ type: 'disconnect' });
      }

      // handle disconnection immediately
      this.onDisconnect('booted');
    }

    return this;
  };

  /**
   * Disconnects the socket with a sync XHR.
   *
   * @api private
   */

  Socket.prototype.disconnectSync = function () {
    // ensure disconnection
    var xhr = io.util.request();
    var uri = [
        'http' + (this.options.secure ? 's' : '') + ':/'
      , this.options.host + ':' + this.options.port
      , this.options.resource
      , io.protocol
      , ''
      , this.sessionid
    ].join('/') + '/?disconnect=1';

    xhr.open('GET', uri, false);
    xhr.send(null);

    // handle disconnection immediately
    this.onDisconnect('booted');
  };

  /**
   * Check if we need to use cross domain enabled transports. Cross domain would
   * be a different port or different domain name.
   *
   * @returns {Boolean}
   * @api private
   */

  Socket.prototype.isXDomain = function () {

    var port = global.location.port ||
      ('https:' == global.location.protocol ? 443 : 80);

    return this.options.host !== global.location.hostname 
      || this.options.port != port;
  };

  /**
   * Called upon handshake.
   *
   * @api private
   */

  Socket.prototype.onConnect = function () {
    if (!this.connected) {
      this.connected = true;
      this.connecting = false;
      if (!this.doBuffer) {
        // make sure to flush the buffer
        this.setBuffer(false);
      }
      this.emit('connect');
    }
  };

  /**
   * Called when the transport opens
   *
   * @api private
   */

  Socket.prototype.onOpen = function () {
    this.open = true;
  };

  /**
   * Called when the transport closes.
   *
   * @api private
   */

  Socket.prototype.onClose = function () {
    this.open = false;
    clearTimeout(this.heartbeatTimeoutTimer);
  };

  /**
   * Called when the transport first opens a connection
   *
   * @param text
   */

  Socket.prototype.onPacket = function (packet) {
    this.of(packet.endpoint).onPacket(packet);
  };

  /**
   * Handles an error.
   *
   * @api private
   */

  Socket.prototype.onError = function (err) {
    if (err && err.advice) {
      if (err.advice === 'reconnect' && (this.connected || this.connecting)) {
        this.disconnect();
        if (this.options.reconnect) {
          this.reconnect();
        }
      }
    }

    this.publish('error', err && err.reason ? err.reason : err);
  };

  /**
   * Called when the transport disconnects.
   *
   * @api private
   */

  Socket.prototype.onDisconnect = function (reason) {
    var wasConnected = this.connected
      , wasConnecting = this.connecting;

    this.connected = false;
    this.connecting = false;
    this.open = false;

    if (wasConnected || wasConnecting) {
      this.transport.close();
      this.transport.clearTimeouts();
      if (wasConnected) {
        this.publish('disconnect', reason);

        if ('booted' != reason && this.options.reconnect && !this.reconnecting) {
          this.reconnect();
        }
      }
    }
  };

  /**
   * Called upon reconnection.
   *
   * @api private
   */

  Socket.prototype.reconnect = function () {
    this.reconnecting = true;
    this.reconnectionAttempts = 0;
    this.reconnectionDelay = this.options['reconnection delay'];

    var self = this
      , maxAttempts = this.options['max reconnection attempts']
      , tryMultiple = this.options['try multiple transports']
      , limit = this.options['reconnection limit'];

    function reset () {
      if (self.connected) {
        for (var i in self.namespaces) {
          if (self.namespaces.hasOwnProperty(i) && '' !== i) {
              self.namespaces[i].packet({ type: 'connect' });
          }
        }
        self.publish('reconnect', self.transport.name, self.reconnectionAttempts);
      }

      clearTimeout(self.reconnectionTimer);

      self.removeListener('connect_failed', maybeReconnect);
      self.removeListener('connect', maybeReconnect);

      self.reconnecting = false;

      delete self.reconnectionAttempts;
      delete self.reconnectionDelay;
      delete self.reconnectionTimer;
      delete self.redoTransports;

      self.options['try multiple transports'] = tryMultiple;
    };

    function maybeReconnect () {
      if (!self.reconnecting) {
        return;
      }

      if (self.connected) {
        return reset();
      };

      if (self.connecting && self.reconnecting) {
        return self.reconnectionTimer = setTimeout(maybeReconnect, 1000);
      }

      if (self.reconnectionAttempts++ >= maxAttempts) {
        if (!self.redoTransports) {
          self.on('connect_failed', maybeReconnect);
          self.options['try multiple transports'] = true;
          self.transports = self.origTransports;
          self.transport = self.getTransport();
          self.redoTransports = true;
          self.connect();
        } else {
          self.publish('reconnect_failed');
          reset();
        }
      } else {
        if (self.reconnectionDelay < limit) {
          self.reconnectionDelay *= 2; // exponential back off
        }

        self.connect();
        self.publish('reconnecting', self.reconnectionDelay, self.reconnectionAttempts);
        self.reconnectionTimer = setTimeout(maybeReconnect, self.reconnectionDelay);
      }
    };

    this.options['try multiple transports'] = false;
    this.reconnectionTimer = setTimeout(maybeReconnect, this.reconnectionDelay);

    this.on('connect', maybeReconnect);
  };

})(
    'undefined' != typeof io ? io : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
  , this
);
/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Expose constructor.
   */

  exports.SocketNamespace = SocketNamespace;

  /**
   * Socket namespace constructor.
   *
   * @constructor
   * @api public
   */

  function SocketNamespace (socket, name) {
    this.socket = socket;
    this.name = name || '';
    this.flags = {};
    this.json = new Flag(this, 'json');
    this.ackPackets = 0;
    this.acks = {};
  };

  /**
   * Apply EventEmitter mixin.
   */

  io.util.mixin(SocketNamespace, io.EventEmitter);

  /**
   * Copies emit since we override it
   *
   * @api private
   */

  SocketNamespace.prototype.$emit = io.EventEmitter.prototype.emit;

  /**
   * Creates a new namespace, by proxying the request to the socket. This
   * allows us to use the synax as we do on the server.
   *
   * @api public
   */

  SocketNamespace.prototype.of = function () {
    return this.socket.of.apply(this.socket, arguments);
  };

  /**
   * Sends a packet.
   *
   * @api private
   */

  SocketNamespace.prototype.packet = function (packet) {
    packet.endpoint = this.name;
    this.socket.packet(packet);
    this.flags = {};
    return this;
  };

  /**
   * Sends a message
   *
   * @api public
   */

  SocketNamespace.prototype.send = function (data, fn) {
    var packet = {
        type: this.flags.json ? 'json' : 'message'
      , data: data
    };

    if ('function' == typeof fn) {
      packet.id = ++this.ackPackets;
      packet.ack = true;
      this.acks[packet.id] = fn;
    }

    return this.packet(packet);
  };

  /**
   * Emits an event
   *
   * @api public
   */
  
  SocketNamespace.prototype.emit = function (name) {
    var args = Array.prototype.slice.call(arguments, 1)
      , lastArg = args[args.length - 1]
      , packet = {
            type: 'event'
          , name: name
        };

    if ('function' == typeof lastArg) {
      packet.id = ++this.ackPackets;
      packet.ack = 'data';
      this.acks[packet.id] = lastArg;
      args = args.slice(0, args.length - 1);
    }

    packet.args = args;

    return this.packet(packet);
  };

  /**
   * Disconnects the namespace
   *
   * @api private
   */

  SocketNamespace.prototype.disconnect = function () {
    if (this.name === '') {
      this.socket.disconnect();
    } else {
      this.packet({ type: 'disconnect' });
      this.$emit('disconnect');
    }

    return this;
  };

  /**
   * Handles a packet
   *
   * @api private
   */

  SocketNamespace.prototype.onPacket = function (packet) {
    var self = this;

    function ack () {
      self.packet({
          type: 'ack'
        , args: io.util.toArray(arguments)
        , ackId: packet.id
      });
    };

    switch (packet.type) {
      case 'connect':
        this.$emit('connect');
        break;

      case 'disconnect':
        if (this.name === '') {
          this.socket.onDisconnect(packet.reason || 'booted');
        } else {
          this.$emit('disconnect', packet.reason);
        }
        break;

      case 'message':
      case 'json':
        var params = ['message', packet.data];

        if (packet.ack == 'data') {
          params.push(ack);
        } else if (packet.ack) {
          this.packet({ type: 'ack', ackId: packet.id });
        }

        this.$emit.apply(this, params);
        break;

      case 'event':
        var params = [packet.name].concat(packet.args);

        if (packet.ack == 'data')
          params.push(ack);

        this.$emit.apply(this, params);
        break;

      case 'ack':
        if (this.acks[packet.ackId]) {
          this.acks[packet.ackId].apply(this, packet.args);
          delete this.acks[packet.ackId];
        }
        break;

      case 'error':
        if (packet.advice){
          this.socket.onError(packet);
        } else {
          if (packet.reason == 'unauthorized') {
            this.$emit('connect_failed', packet.reason);
          } else {
            this.$emit('error', packet.reason);
          }
        }
        break;
    }
  };

  /**
   * Flag interface.
   *
   * @api private
   */

  function Flag (nsp, name) {
    this.namespace = nsp;
    this.name = name;
  };

  /**
   * Send a message
   *
   * @api public
   */

  Flag.prototype.send = function () {
    this.namespace.flags[this.name] = true;
    this.namespace.send.apply(this.namespace, arguments);
  };

  /**
   * Emit an event
   *
   * @api public
   */

  Flag.prototype.emit = function () {
    this.namespace.flags[this.name] = true;
    this.namespace.emit.apply(this.namespace, arguments);
  };

})(
    'undefined' != typeof io ? io : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io, global) {

  /**
   * Expose constructor.
   */

  exports.websocket = WS;

  /**
   * The WebSocket transport uses the HTML5 WebSocket API to establish an
   * persistent connection with the Socket.IO server. This transport will also
   * be inherited by the FlashSocket fallback as it provides a API compatible
   * polyfill for the WebSockets.
   *
   * @constructor
   * @extends {io.Transport}
   * @api public
   */

  function WS (socket) {
    io.Transport.apply(this, arguments);
  };

  /**
   * Inherits from Transport.
   */

  io.util.inherit(WS, io.Transport);

  /**
   * Transport name
   *
   * @api public
   */

  WS.prototype.name = 'websocket';

  /**
   * Initializes a new `WebSocket` connection with the Socket.IO server. We attach
   * all the appropriate listeners to handle the responses from the server.
   *
   * @returns {Transport}
   * @api public
   */

  WS.prototype.open = function () {
    var query = io.util.query(this.socket.options.query)
      , self = this
      , Socket


    if (!Socket) {
      Socket = global.MozWebSocket || global.WebSocket;
    }

    this.websocket = new Socket(this.prepareUrl() + query);

    this.websocket.onopen = function () {
      self.onOpen();
      self.socket.setBuffer(false);
    };
    this.websocket.onmessage = function (ev) {
      self.onData(ev.data);
    };
    this.websocket.onclose = function () {
      self.onClose();
      self.socket.setBuffer(true);
    };
    this.websocket.onerror = function (e) {
      self.onError(e);
    };

    return this;
  };

  /**
   * Send a message to the Socket.IO server. The message will automatically be
   * encoded in the correct message format.
   *
   * @returns {Transport}
   * @api public
   */

  // Do to a bug in the current IDevices browser, we need to wrap the send in a 
  // setTimeout, when they resume from sleeping the browser will crash if 
  // we don't allow the browser time to detect the socket has been closed
  if (io.util.ua.iDevice) {
    WS.prototype.send = function (data) {
      var self = this;
      setTimeout(function() {
         self.websocket.send(data);
      },0);
      return this;
    };
  } else {
    WS.prototype.send = function (data) {
      this.websocket.send(data);
      return this;
    };
  }

  /**
   * Payload
   *
   * @api private
   */

  WS.prototype.payload = function (arr) {
    for (var i = 0, l = arr.length; i < l; i++) {
      this.packet(arr[i]);
    }
    return this;
  };

  /**
   * Disconnect the established `WebSocket` connection.
   *
   * @returns {Transport}
   * @api public
   */

  WS.prototype.close = function () {
    this.websocket.close();
    return this;
  };

  /**
   * Handle the errors that `WebSocket` might be giving when we
   * are attempting to connect or send messages.
   *
   * @param {Error} e The error.
   * @api private
   */

  WS.prototype.onError = function (e) {
    this.socket.onError(e);
  };

  /**
   * Returns the appropriate scheme for the URI generation.
   *
   * @api private
   */
  WS.prototype.scheme = function () {
    return this.socket.options.secure ? 'wss' : 'ws';
  };

  /**
   * Checks if the browser has support for native `WebSockets` and that
   * it's not the polyfill created for the FlashSocket transport.
   *
   * @return {Boolean}
   * @api public
   */

  WS.check = function () {
    return ('WebSocket' in global && !('__addTask' in WebSocket))
          || 'MozWebSocket' in global;
  };

  /**
   * Check if the `WebSocket` transport support cross domain communications.
   *
   * @returns {Boolean}
   * @api public
   */

  WS.xdomainCheck = function () {
    return true;
  };

  /**
   * Add the transport to your public io.transports array.
   *
   * @api private
   */

  io.transports.push('websocket');

})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
  , this
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Expose constructor.
   */

  exports.flashsocket = Flashsocket;

  /**
   * The FlashSocket transport. This is a API wrapper for the HTML5 WebSocket
   * specification. It uses a .swf file to communicate with the server. If you want
   * to serve the .swf file from a other server than where the Socket.IO script is
   * coming from you need to use the insecure version of the .swf. More information
   * about this can be found on the github page.
   *
   * @constructor
   * @extends {io.Transport.websocket}
   * @api public
   */

  function Flashsocket () {
    io.Transport.websocket.apply(this, arguments);
  };

  /**
   * Inherits from Transport.
   */

  io.util.inherit(Flashsocket, io.Transport.websocket);

  /**
   * Transport name
   *
   * @api public
   */

  Flashsocket.prototype.name = 'flashsocket';

  /**
   * Disconnect the established `FlashSocket` connection. This is done by adding a 
   * new task to the FlashSocket. The rest will be handled off by the `WebSocket` 
   * transport.
   *
   * @returns {Transport}
   * @api public
   */

  Flashsocket.prototype.open = function () {
    var self = this
      , args = arguments;

    WebSocket.__addTask(function () {
      io.Transport.websocket.prototype.open.apply(self, args);
    });
    return this;
  };
  
  /**
   * Sends a message to the Socket.IO server. This is done by adding a new
   * task to the FlashSocket. The rest will be handled off by the `WebSocket` 
   * transport.
   *
   * @returns {Transport}
   * @api public
   */

  Flashsocket.prototype.send = function () {
    var self = this, args = arguments;
    WebSocket.__addTask(function () {
      io.Transport.websocket.prototype.send.apply(self, args);
    });
    return this;
  };

  /**
   * Disconnects the established `FlashSocket` connection.
   *
   * @returns {Transport}
   * @api public
   */

  Flashsocket.prototype.close = function () {
    WebSocket.__tasks.length = 0;
    io.Transport.websocket.prototype.close.call(this);
    return this;
  };

  /**
   * The WebSocket fall back needs to append the flash container to the body
   * element, so we need to make sure we have access to it. Or defer the call
   * until we are sure there is a body element.
   *
   * @param {Socket} socket The socket instance that needs a transport
   * @param {Function} fn The callback
   * @api private
   */

  Flashsocket.prototype.ready = function (socket, fn) {
    function init () {
      var options = socket.options
        , port = options['flash policy port']
        , path = [
              'http' + (options.secure ? 's' : '') + ':/'
            , options.host + ':' + options.port
            , options.resource
            , 'static/flashsocket'
            , 'WebSocketMain' + (socket.isXDomain() ? 'Insecure' : '') + '.swf'
          ];

      // Only start downloading the swf file when the checked that this browser
      // actually supports it
      if (!Flashsocket.loaded) {
        if (typeof WEB_SOCKET_SWF_LOCATION === 'undefined') {
          // Set the correct file based on the XDomain settings
          WEB_SOCKET_SWF_LOCATION = path.join('/');
        }

        if (port !== 843) {
          WebSocket.loadFlashPolicyFile('xmlsocket://' + options.host + ':' + port);
        }

        WebSocket.__initialize();
        Flashsocket.loaded = true;
      }

      fn.call(self);
    }

    var self = this;
    if (document.body) return init();

    io.util.load(init);
  };

  /**
   * Check if the FlashSocket transport is supported as it requires that the Adobe
   * Flash Player plug-in version `10.0.0` or greater is installed. And also check if
   * the polyfill is correctly loaded.
   *
   * @returns {Boolean}
   * @api public
   */

  Flashsocket.check = function () {
    if (
        typeof WebSocket == 'undefined'
      || !('__initialize' in WebSocket) || !swfobject
    ) return false;

    return swfobject.getFlashPlayerVersion().major >= 10;
  };

  /**
   * Check if the FlashSocket transport can be used as cross domain / cross origin 
   * transport. Because we can't see which type (secure or insecure) of .swf is used
   * we will just return true.
   *
   * @returns {Boolean}
   * @api public
   */

  Flashsocket.xdomainCheck = function () {
    return true;
  };

  /**
   * Disable AUTO_INITIALIZATION
   */

  if (typeof window != 'undefined') {
    WEB_SOCKET_DISABLE_AUTO_INITIALIZATION = true;
  }

  /**
   * Add the transport to your public io.transports array.
   *
   * @api private
   */

  io.transports.push('flashsocket');
})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);
/*	SWFObject v2.2 <http://code.google.com/p/swfobject/> 
	is released under the MIT License <http://www.opensource.org/licenses/mit-license.php> 
*/
if ('undefined' != typeof window) {
var swfobject=function(){var D="undefined",r="object",S="Shockwave Flash",W="ShockwaveFlash.ShockwaveFlash",q="application/x-shockwave-flash",R="SWFObjectExprInst",x="onreadystatechange",O=window,j=document,t=navigator,T=false,U=[h],o=[],N=[],I=[],l,Q,E,B,J=false,a=false,n,G,m=true,M=function(){var aa=typeof j.getElementById!=D&&typeof j.getElementsByTagName!=D&&typeof j.createElement!=D,ah=t.userAgent.toLowerCase(),Y=t.platform.toLowerCase(),ae=Y?/win/.test(Y):/win/.test(ah),ac=Y?/mac/.test(Y):/mac/.test(ah),af=/webkit/.test(ah)?parseFloat(ah.replace(/^.*webkit\/(\d+(\.\d+)?).*$/,"$1")):false,X=!+"\v1",ag=[0,0,0],ab=null;if(typeof t.plugins!=D&&typeof t.plugins[S]==r){ab=t.plugins[S].description;if(ab&&!(typeof t.mimeTypes!=D&&t.mimeTypes[q]&&!t.mimeTypes[q].enabledPlugin)){T=true;X=false;ab=ab.replace(/^.*\s+(\S+\s+\S+$)/,"$1");ag[0]=parseInt(ab.replace(/^(.*)\..*$/,"$1"),10);ag[1]=parseInt(ab.replace(/^.*\.(.*)\s.*$/,"$1"),10);ag[2]=/[a-zA-Z]/.test(ab)?parseInt(ab.replace(/^.*[a-zA-Z]+(.*)$/,"$1"),10):0}}else{if(typeof O[(['Active'].concat('Object').join('X'))]!=D){try{var ad=new window[(['Active'].concat('Object').join('X'))](W);if(ad){ab=ad.GetVariable("$version");if(ab){X=true;ab=ab.split(" ")[1].split(",");ag=[parseInt(ab[0],10),parseInt(ab[1],10),parseInt(ab[2],10)]}}}catch(Z){}}}return{w3:aa,pv:ag,wk:af,ie:X,win:ae,mac:ac}}(),k=function(){if(!M.w3){return}if((typeof j.readyState!=D&&j.readyState=="complete")||(typeof j.readyState==D&&(j.getElementsByTagName("body")[0]||j.body))){f()}if(!J){if(typeof j.addEventListener!=D){j.addEventListener("DOMContentLoaded",f,false)}if(M.ie&&M.win){j.attachEvent(x,function(){if(j.readyState=="complete"){j.detachEvent(x,arguments.callee);f()}});if(O==top){(function(){if(J){return}try{j.documentElement.doScroll("left")}catch(X){setTimeout(arguments.callee,0);return}f()})()}}if(M.wk){(function(){if(J){return}if(!/loaded|complete/.test(j.readyState)){setTimeout(arguments.callee,0);return}f()})()}s(f)}}();function f(){if(J){return}try{var Z=j.getElementsByTagName("body")[0].appendChild(C("span"));Z.parentNode.removeChild(Z)}catch(aa){return}J=true;var X=U.length;for(var Y=0;Y<X;Y++){U[Y]()}}function K(X){if(J){X()}else{U[U.length]=X}}function s(Y){if(typeof O.addEventListener!=D){O.addEventListener("load",Y,false)}else{if(typeof j.addEventListener!=D){j.addEventListener("load",Y,false)}else{if(typeof O.attachEvent!=D){i(O,"onload",Y)}else{if(typeof O.onload=="function"){var X=O.onload;O.onload=function(){X();Y()}}else{O.onload=Y}}}}}function h(){if(T){V()}else{H()}}function V(){var X=j.getElementsByTagName("body")[0];var aa=C(r);aa.setAttribute("type",q);var Z=X.appendChild(aa);if(Z){var Y=0;(function(){if(typeof Z.GetVariable!=D){var ab=Z.GetVariable("$version");if(ab){ab=ab.split(" ")[1].split(",");M.pv=[parseInt(ab[0],10),parseInt(ab[1],10),parseInt(ab[2],10)]}}else{if(Y<10){Y++;setTimeout(arguments.callee,10);return}}X.removeChild(aa);Z=null;H()})()}else{H()}}function H(){var ag=o.length;if(ag>0){for(var af=0;af<ag;af++){var Y=o[af].id;var ab=o[af].callbackFn;var aa={success:false,id:Y};if(M.pv[0]>0){var ae=c(Y);if(ae){if(F(o[af].swfVersion)&&!(M.wk&&M.wk<312)){w(Y,true);if(ab){aa.success=true;aa.ref=z(Y);ab(aa)}}else{if(o[af].expressInstall&&A()){var ai={};ai.data=o[af].expressInstall;ai.width=ae.getAttribute("width")||"0";ai.height=ae.getAttribute("height")||"0";if(ae.getAttribute("class")){ai.styleclass=ae.getAttribute("class")}if(ae.getAttribute("align")){ai.align=ae.getAttribute("align")}var ah={};var X=ae.getElementsByTagName("param");var ac=X.length;for(var ad=0;ad<ac;ad++){if(X[ad].getAttribute("name").toLowerCase()!="movie"){ah[X[ad].getAttribute("name")]=X[ad].getAttribute("value")}}P(ai,ah,Y,ab)}else{p(ae);if(ab){ab(aa)}}}}}else{w(Y,true);if(ab){var Z=z(Y);if(Z&&typeof Z.SetVariable!=D){aa.success=true;aa.ref=Z}ab(aa)}}}}}function z(aa){var X=null;var Y=c(aa);if(Y&&Y.nodeName=="OBJECT"){if(typeof Y.SetVariable!=D){X=Y}else{var Z=Y.getElementsByTagName(r)[0];if(Z){X=Z}}}return X}function A(){return !a&&F("6.0.65")&&(M.win||M.mac)&&!(M.wk&&M.wk<312)}function P(aa,ab,X,Z){a=true;E=Z||null;B={success:false,id:X};var ae=c(X);if(ae){if(ae.nodeName=="OBJECT"){l=g(ae);Q=null}else{l=ae;Q=X}aa.id=R;if(typeof aa.width==D||(!/%$/.test(aa.width)&&parseInt(aa.width,10)<310)){aa.width="310"}if(typeof aa.height==D||(!/%$/.test(aa.height)&&parseInt(aa.height,10)<137)){aa.height="137"}j.title=j.title.slice(0,47)+" - Flash Player Installation";var ad=M.ie&&M.win?(['Active'].concat('').join('X')):"PlugIn",ac="MMredirectURL="+O.location.toString().replace(/&/g,"%26")+"&MMplayerType="+ad+"&MMdoctitle="+j.title;if(typeof ab.flashvars!=D){ab.flashvars+="&"+ac}else{ab.flashvars=ac}if(M.ie&&M.win&&ae.readyState!=4){var Y=C("div");X+="SWFObjectNew";Y.setAttribute("id",X);ae.parentNode.insertBefore(Y,ae);ae.style.display="none";(function(){if(ae.readyState==4){ae.parentNode.removeChild(ae)}else{setTimeout(arguments.callee,10)}})()}u(aa,ab,X)}}function p(Y){if(M.ie&&M.win&&Y.readyState!=4){var X=C("div");Y.parentNode.insertBefore(X,Y);X.parentNode.replaceChild(g(Y),X);Y.style.display="none";(function(){if(Y.readyState==4){Y.parentNode.removeChild(Y)}else{setTimeout(arguments.callee,10)}})()}else{Y.parentNode.replaceChild(g(Y),Y)}}function g(ab){var aa=C("div");if(M.win&&M.ie){aa.innerHTML=ab.innerHTML}else{var Y=ab.getElementsByTagName(r)[0];if(Y){var ad=Y.childNodes;if(ad){var X=ad.length;for(var Z=0;Z<X;Z++){if(!(ad[Z].nodeType==1&&ad[Z].nodeName=="PARAM")&&!(ad[Z].nodeType==8)){aa.appendChild(ad[Z].cloneNode(true))}}}}}return aa}function u(ai,ag,Y){var X,aa=c(Y);if(M.wk&&M.wk<312){return X}if(aa){if(typeof ai.id==D){ai.id=Y}if(M.ie&&M.win){var ah="";for(var ae in ai){if(ai[ae]!=Object.prototype[ae]){if(ae.toLowerCase()=="data"){ag.movie=ai[ae]}else{if(ae.toLowerCase()=="styleclass"){ah+=' class="'+ai[ae]+'"'}else{if(ae.toLowerCase()!="classid"){ah+=" "+ae+'="'+ai[ae]+'"'}}}}}var af="";for(var ad in ag){if(ag[ad]!=Object.prototype[ad]){af+='<param name="'+ad+'" value="'+ag[ad]+'" />'}}aa.outerHTML='<object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"'+ah+">"+af+"</object>";N[N.length]=ai.id;X=c(ai.id)}else{var Z=C(r);Z.setAttribute("type",q);for(var ac in ai){if(ai[ac]!=Object.prototype[ac]){if(ac.toLowerCase()=="styleclass"){Z.setAttribute("class",ai[ac])}else{if(ac.toLowerCase()!="classid"){Z.setAttribute(ac,ai[ac])}}}}for(var ab in ag){if(ag[ab]!=Object.prototype[ab]&&ab.toLowerCase()!="movie"){e(Z,ab,ag[ab])}}aa.parentNode.replaceChild(Z,aa);X=Z}}return X}function e(Z,X,Y){var aa=C("param");aa.setAttribute("name",X);aa.setAttribute("value",Y);Z.appendChild(aa)}function y(Y){var X=c(Y);if(X&&X.nodeName=="OBJECT"){if(M.ie&&M.win){X.style.display="none";(function(){if(X.readyState==4){b(Y)}else{setTimeout(arguments.callee,10)}})()}else{X.parentNode.removeChild(X)}}}function b(Z){var Y=c(Z);if(Y){for(var X in Y){if(typeof Y[X]=="function"){Y[X]=null}}Y.parentNode.removeChild(Y)}}function c(Z){var X=null;try{X=j.getElementById(Z)}catch(Y){}return X}function C(X){return j.createElement(X)}function i(Z,X,Y){Z.attachEvent(X,Y);I[I.length]=[Z,X,Y]}function F(Z){var Y=M.pv,X=Z.split(".");X[0]=parseInt(X[0],10);X[1]=parseInt(X[1],10)||0;X[2]=parseInt(X[2],10)||0;return(Y[0]>X[0]||(Y[0]==X[0]&&Y[1]>X[1])||(Y[0]==X[0]&&Y[1]==X[1]&&Y[2]>=X[2]))?true:false}function v(ac,Y,ad,ab){if(M.ie&&M.mac){return}var aa=j.getElementsByTagName("head")[0];if(!aa){return}var X=(ad&&typeof ad=="string")?ad:"screen";if(ab){n=null;G=null}if(!n||G!=X){var Z=C("style");Z.setAttribute("type","text/css");Z.setAttribute("media",X);n=aa.appendChild(Z);if(M.ie&&M.win&&typeof j.styleSheets!=D&&j.styleSheets.length>0){n=j.styleSheets[j.styleSheets.length-1]}G=X}if(M.ie&&M.win){if(n&&typeof n.addRule==r){n.addRule(ac,Y)}}else{if(n&&typeof j.createTextNode!=D){n.appendChild(j.createTextNode(ac+" {"+Y+"}"))}}}function w(Z,X){if(!m){return}var Y=X?"visible":"hidden";if(J&&c(Z)){c(Z).style.visibility=Y}else{v("#"+Z,"visibility:"+Y)}}function L(Y){var Z=/[\\\"<>\.;]/;var X=Z.exec(Y)!=null;return X&&typeof encodeURIComponent!=D?encodeURIComponent(Y):Y}var d=function(){if(M.ie&&M.win){window.attachEvent("onunload",function(){var ac=I.length;for(var ab=0;ab<ac;ab++){I[ab][0].detachEvent(I[ab][1],I[ab][2])}var Z=N.length;for(var aa=0;aa<Z;aa++){y(N[aa])}for(var Y in M){M[Y]=null}M=null;for(var X in swfobject){swfobject[X]=null}swfobject=null})}}();return{registerObject:function(ab,X,aa,Z){if(M.w3&&ab&&X){var Y={};Y.id=ab;Y.swfVersion=X;Y.expressInstall=aa;Y.callbackFn=Z;o[o.length]=Y;w(ab,false)}else{if(Z){Z({success:false,id:ab})}}},getObjectById:function(X){if(M.w3){return z(X)}},embedSWF:function(ab,ah,ae,ag,Y,aa,Z,ad,af,ac){var X={success:false,id:ah};if(M.w3&&!(M.wk&&M.wk<312)&&ab&&ah&&ae&&ag&&Y){w(ah,false);K(function(){ae+="";ag+="";var aj={};if(af&&typeof af===r){for(var al in af){aj[al]=af[al]}}aj.data=ab;aj.width=ae;aj.height=ag;var am={};if(ad&&typeof ad===r){for(var ak in ad){am[ak]=ad[ak]}}if(Z&&typeof Z===r){for(var ai in Z){if(typeof am.flashvars!=D){am.flashvars+="&"+ai+"="+Z[ai]}else{am.flashvars=ai+"="+Z[ai]}}}if(F(Y)){var an=u(aj,am,ah);if(aj.id==ah){w(ah,true)}X.success=true;X.ref=an}else{if(aa&&A()){aj.data=aa;P(aj,am,ah,ac);return}else{w(ah,true)}}if(ac){ac(X)}})}else{if(ac){ac(X)}}},switchOffAutoHideShow:function(){m=false},ua:M,getFlashPlayerVersion:function(){return{major:M.pv[0],minor:M.pv[1],release:M.pv[2]}},hasFlashPlayerVersion:F,createSWF:function(Z,Y,X){if(M.w3){return u(Z,Y,X)}else{return undefined}},showExpressInstall:function(Z,aa,X,Y){if(M.w3&&A()){P(Z,aa,X,Y)}},removeSWF:function(X){if(M.w3){y(X)}},createCSS:function(aa,Z,Y,X){if(M.w3){v(aa,Z,Y,X)}},addDomLoadEvent:K,addLoadEvent:s,getQueryParamValue:function(aa){var Z=j.location.search||j.location.hash;if(Z){if(/\?/.test(Z)){Z=Z.split("?")[1]}if(aa==null){return L(Z)}var Y=Z.split("&");for(var X=0;X<Y.length;X++){if(Y[X].substring(0,Y[X].indexOf("="))==aa){return L(Y[X].substring((Y[X].indexOf("=")+1)))}}}return""},expressInstallCallback:function(){if(a){var X=c(R);if(X&&l){X.parentNode.replaceChild(l,X);if(Q){w(Q,true);if(M.ie&&M.win){l.style.display="block"}}if(E){E(B)}}a=false}}}}();
}
// Copyright: Hiroshi Ichikawa <http://gimite.net/en/>
// License: New BSD License
// Reference: http://dev.w3.org/html5/websockets/
// Reference: http://tools.ietf.org/html/draft-hixie-thewebsocketprotocol

(function() {
  
  if ('undefined' == typeof window || window.WebSocket) return;

  var console = window.console;
  if (!console || !console.log || !console.error) {
    console = {log: function(){ }, error: function(){ }};
  }
  
  if (!swfobject.hasFlashPlayerVersion("10.0.0")) {
    console.error("Flash Player >= 10.0.0 is required.");
    return;
  }
  if (location.protocol == "file:") {
    console.error(
      "WARNING: web-socket-js doesn't work in file:///... URL " +
      "unless you set Flash Security Settings properly. " +
      "Open the page via Web server i.e. http://...");
  }

  /**
   * This class represents a faux web socket.
   * @param {string} url
   * @param {array or string} protocols
   * @param {string} proxyHost
   * @param {int} proxyPort
   * @param {string} headers
   */
  WebSocket = function(url, protocols, proxyHost, proxyPort, headers) {
    var self = this;
    self.__id = WebSocket.__nextId++;
    WebSocket.__instances[self.__id] = self;
    self.readyState = WebSocket.CONNECTING;
    self.bufferedAmount = 0;
    self.__events = {};
    if (!protocols) {
      protocols = [];
    } else if (typeof protocols == "string") {
      protocols = [protocols];
    }
    // Uses setTimeout() to make sure __createFlash() runs after the caller sets ws.onopen etc.
    // Otherwise, when onopen fires immediately, onopen is called before it is set.
    setTimeout(function() {
      WebSocket.__addTask(function() {
        WebSocket.__flash.create(
            self.__id, url, protocols, proxyHost || null, proxyPort || 0, headers || null);
      });
    }, 0);
  };

  /**
   * Send data to the web socket.
   * @param {string} data  The data to send to the socket.
   * @return {boolean}  True for success, false for failure.
   */
  WebSocket.prototype.send = function(data) {
    if (this.readyState == WebSocket.CONNECTING) {
      throw "INVALID_STATE_ERR: Web Socket connection has not been established";
    }
    // We use encodeURIComponent() here, because FABridge doesn't work if
    // the argument includes some characters. We don't use escape() here
    // because of this:
    // https://developer.mozilla.org/en/Core_JavaScript_1.5_Guide/Functions#escape_and_unescape_Functions
    // But it looks decodeURIComponent(encodeURIComponent(s)) doesn't
    // preserve all Unicode characters either e.g. "\uffff" in Firefox.
    // Note by wtritch: Hopefully this will not be necessary using ExternalInterface.  Will require
    // additional testing.
    var result = WebSocket.__flash.send(this.__id, encodeURIComponent(data));
    if (result < 0) { // success
      return true;
    } else {
      this.bufferedAmount += result;
      return false;
    }
  };

  /**
   * Close this web socket gracefully.
   */
  WebSocket.prototype.close = function() {
    if (this.readyState == WebSocket.CLOSED || this.readyState == WebSocket.CLOSING) {
      return;
    }
    this.readyState = WebSocket.CLOSING;
    WebSocket.__flash.close(this.__id);
  };

  /**
   * Implementation of {@link <a href="http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-registration">DOM 2 EventTarget Interface</a>}
   *
   * @param {string} type
   * @param {function} listener
   * @param {boolean} useCapture
   * @return void
   */
  WebSocket.prototype.addEventListener = function(type, listener, useCapture) {
    if (!(type in this.__events)) {
      this.__events[type] = [];
    }
    this.__events[type].push(listener);
  };

  /**
   * Implementation of {@link <a href="http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-registration">DOM 2 EventTarget Interface</a>}
   *
   * @param {string} type
   * @param {function} listener
   * @param {boolean} useCapture
   * @return void
   */
  WebSocket.prototype.removeEventListener = function(type, listener, useCapture) {
    if (!(type in this.__events)) return;
    var events = this.__events[type];
    for (var i = events.length - 1; i >= 0; --i) {
      if (events[i] === listener) {
        events.splice(i, 1);
        break;
      }
    }
  };

  /**
   * Implementation of {@link <a href="http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-registration">DOM 2 EventTarget Interface</a>}
   *
   * @param {Event} event
   * @return void
   */
  WebSocket.prototype.dispatchEvent = function(event) {
    var events = this.__events[event.type] || [];
    for (var i = 0; i < events.length; ++i) {
      events[i](event);
    }
    var handler = this["on" + event.type];
    if (handler) handler(event);
  };

  /**
   * Handles an event from Flash.
   * @param {Object} flashEvent
   */
  WebSocket.prototype.__handleEvent = function(flashEvent) {
    if ("readyState" in flashEvent) {
      this.readyState = flashEvent.readyState;
    }
    if ("protocol" in flashEvent) {
      this.protocol = flashEvent.protocol;
    }
    
    var jsEvent;
    if (flashEvent.type == "open" || flashEvent.type == "error") {
      jsEvent = this.__createSimpleEvent(flashEvent.type);
    } else if (flashEvent.type == "close") {
      // TODO implement jsEvent.wasClean
      jsEvent = this.__createSimpleEvent("close");
    } else if (flashEvent.type == "message") {
      var data = decodeURIComponent(flashEvent.message);
      jsEvent = this.__createMessageEvent("message", data);
    } else {
      throw "unknown event type: " + flashEvent.type;
    }
    
    this.dispatchEvent(jsEvent);
  };
  
  WebSocket.prototype.__createSimpleEvent = function(type) {
    if (document.createEvent && window.Event) {
      var event = document.createEvent("Event");
      event.initEvent(type, false, false);
      return event;
    } else {
      return {type: type, bubbles: false, cancelable: false};
    }
  };
  
  WebSocket.prototype.__createMessageEvent = function(type, data) {
    if (document.createEvent && window.MessageEvent && !window.opera) {
      var event = document.createEvent("MessageEvent");
      event.initMessageEvent("message", false, false, data, null, null, window, null);
      return event;
    } else {
      // IE and Opera, the latter one truncates the data parameter after any 0x00 bytes.
      return {type: type, data: data, bubbles: false, cancelable: false};
    }
  };
  
  /**
   * Define the WebSocket readyState enumeration.
   */
  WebSocket.CONNECTING = 0;
  WebSocket.OPEN = 1;
  WebSocket.CLOSING = 2;
  WebSocket.CLOSED = 3;

  WebSocket.__flash = null;
  WebSocket.__instances = {};
  WebSocket.__tasks = [];
  WebSocket.__nextId = 0;
  
  /**
   * Load a new flash security policy file.
   * @param {string} url
   */
  WebSocket.loadFlashPolicyFile = function(url){
    WebSocket.__addTask(function() {
      WebSocket.__flash.loadManualPolicyFile(url);
    });
  };

  /**
   * Loads WebSocketMain.swf and creates WebSocketMain object in Flash.
   */
  WebSocket.__initialize = function() {
    if (WebSocket.__flash) return;
    
    if (WebSocket.__swfLocation) {
      // For backword compatibility.
      window.WEB_SOCKET_SWF_LOCATION = WebSocket.__swfLocation;
    }
    if (!window.WEB_SOCKET_SWF_LOCATION) {
      console.error("[WebSocket] set WEB_SOCKET_SWF_LOCATION to location of WebSocketMain.swf");
      return;
    }
    var container = document.createElement("div");
    container.id = "webSocketContainer";
    // Hides Flash box. We cannot use display: none or visibility: hidden because it prevents
    // Flash from loading at least in IE. So we move it out of the screen at (-100, -100).
    // But this even doesn't work with Flash Lite (e.g. in Droid Incredible). So with Flash
    // Lite, we put it at (0, 0). This shows 1x1 box visible at left-top corner but this is
    // the best we can do as far as we know now.
    container.style.position = "absolute";
    if (WebSocket.__isFlashLite()) {
      container.style.left = "0px";
      container.style.top = "0px";
    } else {
      container.style.left = "-100px";
      container.style.top = "-100px";
    }
    var holder = document.createElement("div");
    holder.id = "webSocketFlash";
    container.appendChild(holder);
    document.body.appendChild(container);
    // See this article for hasPriority:
    // http://help.adobe.com/en_US/as3/mobile/WS4bebcd66a74275c36cfb8137124318eebc6-7ffd.html
    swfobject.embedSWF(
      WEB_SOCKET_SWF_LOCATION,
      "webSocketFlash",
      "1" /* width */,
      "1" /* height */,
      "10.0.0" /* SWF version */,
      null,
      null,
      {hasPriority: true, swliveconnect : true, allowScriptAccess: "always"},
      null,
      function(e) {
        if (!e.success) {
          console.error("[WebSocket] swfobject.embedSWF failed");
        }
      });
  };
  
  /**
   * Called by Flash to notify JS that it's fully loaded and ready
   * for communication.
   */
  WebSocket.__onFlashInitialized = function() {
    // We need to set a timeout here to avoid round-trip calls
    // to flash during the initialization process.
    setTimeout(function() {
      WebSocket.__flash = document.getElementById("webSocketFlash");
      WebSocket.__flash.setCallerUrl(location.href);
      WebSocket.__flash.setDebug(!!window.WEB_SOCKET_DEBUG);
      for (var i = 0; i < WebSocket.__tasks.length; ++i) {
        WebSocket.__tasks[i]();
      }
      WebSocket.__tasks = [];
    }, 0);
  };
  
  /**
   * Called by Flash to notify WebSockets events are fired.
   */
  WebSocket.__onFlashEvent = function() {
    setTimeout(function() {
      try {
        // Gets events using receiveEvents() instead of getting it from event object
        // of Flash event. This is to make sure to keep message order.
        // It seems sometimes Flash events don't arrive in the same order as they are sent.
        var events = WebSocket.__flash.receiveEvents();
        for (var i = 0; i < events.length; ++i) {
          WebSocket.__instances[events[i].webSocketId].__handleEvent(events[i]);
        }
      } catch (e) {
        console.error(e);
      }
    }, 0);
    return true;
  };
  
  // Called by Flash.
  WebSocket.__log = function(message) {
    console.log(decodeURIComponent(message));
  };
  
  // Called by Flash.
  WebSocket.__error = function(message) {
    console.error(decodeURIComponent(message));
  };
  
  WebSocket.__addTask = function(task) {
    if (WebSocket.__flash) {
      task();
    } else {
      WebSocket.__tasks.push(task);
    }
  };
  
  /**
   * Test if the browser is running flash lite.
   * @return {boolean} True if flash lite is running, false otherwise.
   */
  WebSocket.__isFlashLite = function() {
    if (!window.navigator || !window.navigator.mimeTypes) {
      return false;
    }
    var mimeType = window.navigator.mimeTypes["application/x-shockwave-flash"];
    if (!mimeType || !mimeType.enabledPlugin || !mimeType.enabledPlugin.filename) {
      return false;
    }
    return mimeType.enabledPlugin.filename.match(/flashlite/i) ? true : false;
  };
  
  if (!window.WEB_SOCKET_DISABLE_AUTO_INITIALIZATION) {
    if (window.addEventListener) {
      window.addEventListener("load", function(){
        WebSocket.__initialize();
      }, false);
    } else {
      window.attachEvent("onload", function(){
        WebSocket.__initialize();
      });
    }
  }
  
})();

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io, global) {

  /**
   * Expose constructor.
   *
   * @api public
   */

  exports.XHR = XHR;

  /**
   * XHR constructor
   *
   * @costructor
   * @api public
   */

  function XHR (socket) {
    if (!socket) return;

    io.Transport.apply(this, arguments);
    this.sendBuffer = [];
  };

  /**
   * Inherits from Transport.
   */

  io.util.inherit(XHR, io.Transport);

  /**
   * Establish a connection
   *
   * @returns {Transport}
   * @api public
   */

  XHR.prototype.open = function () {
    this.socket.setBuffer(false);
    this.onOpen();
    this.get();

    // we need to make sure the request succeeds since we have no indication
    // whether the request opened or not until it succeeded.
    this.setCloseTimeout();

    return this;
  };

  /**
   * Check if we need to send data to the Socket.IO server, if we have data in our
   * buffer we encode it and forward it to the `post` method.
   *
   * @api private
   */

  XHR.prototype.payload = function (payload) {
    var msgs = [];

    for (var i = 0, l = payload.length; i < l; i++) {
      msgs.push(io.parser.encodePacket(payload[i]));
    }

    this.send(io.parser.encodePayload(msgs));
  };

  /**
   * Send data to the Socket.IO server.
   *
   * @param data The message
   * @returns {Transport}
   * @api public
   */

  XHR.prototype.send = function (data) {
    this.post(data);
    return this;
  };

  /**
   * Posts a encoded message to the Socket.IO server.
   *
   * @param {String} data A encoded message.
   * @api private
   */

  function empty () { };

  XHR.prototype.post = function (data) {
    var self = this;
    this.socket.setBuffer(true);

    function stateChange () {
      if (this.readyState == 4) {
        this.onreadystatechange = empty;
        self.posting = false;

        if (this.status == 200){
          self.socket.setBuffer(false);
        } else {
          self.onClose();
        }
      }
    }

    function onload () {
      this.onload = empty;
      self.socket.setBuffer(false);
    };

    this.sendXHR = this.request('POST');

    if (global.XDomainRequest && this.sendXHR instanceof XDomainRequest) {
      this.sendXHR.onload = this.sendXHR.onerror = onload;
    } else {
      this.sendXHR.onreadystatechange = stateChange;
    }

    this.sendXHR.send(data);
  };

  /**
   * Disconnects the established `XHR` connection.
   *
   * @returns {Transport}
   * @api public
   */

  XHR.prototype.close = function () {
    this.onClose();
    return this;
  };

  /**
   * Generates a configured XHR request
   *
   * @param {String} url The url that needs to be requested.
   * @param {String} method The method the request should use.
   * @returns {XMLHttpRequest}
   * @api private
   */

  XHR.prototype.request = function (method) {
    var req = io.util.request(this.socket.isXDomain())
      , query = io.util.query(this.socket.options.query, 't=' + +new Date);

    req.open(method || 'GET', this.prepareUrl() + query, true);

    if (method == 'POST') {
      try {
        if (req.setRequestHeader) {
          req.setRequestHeader('Content-type', 'text/plain;charset=UTF-8');
        } else {
          // XDomainRequest
          req.contentType = 'text/plain';
        }
      } catch (e) {}
    }

    return req;
  };

  /**
   * Returns the scheme to use for the transport URLs.
   *
   * @api private
   */

  XHR.prototype.scheme = function () {
    return this.socket.options.secure ? 'https' : 'http';
  };

  /**
   * Check if the XHR transports are supported
   *
   * @param {Boolean} xdomain Check if we support cross domain requests.
   * @returns {Boolean}
   * @api public
   */

  XHR.check = function (socket, xdomain) {
    try {
      var request = io.util.request(xdomain),
          usesXDomReq = (global.XDomainRequest && request instanceof XDomainRequest),
          socketProtocol = (socket && socket.options && socket.options.secure ? 'https:' : 'http:'),
          isXProtocol = (global.location && socketProtocol != global.location.protocol);
      if (request && !(usesXDomReq && isXProtocol)) {
        return true;
      }
    } catch(e) {}

    return false;
  };

  /**
   * Check if the XHR transport supports cross domain requests.
   *
   * @returns {Boolean}
   * @api public
   */

  XHR.xdomainCheck = function (socket) {
    return XHR.check(socket, true);
  };

})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
  , this
);
/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Expose constructor.
   */

  exports.htmlfile = HTMLFile;

  /**
   * The HTMLFile transport creates a `forever iframe` based transport
   * for Internet Explorer. Regular forever iframe implementations will 
   * continuously trigger the browsers buzy indicators. If the forever iframe
   * is created inside a `htmlfile` these indicators will not be trigged.
   *
   * @constructor
   * @extends {io.Transport.XHR}
   * @api public
   */

  function HTMLFile (socket) {
    io.Transport.XHR.apply(this, arguments);
  };

  /**
   * Inherits from XHR transport.
   */

  io.util.inherit(HTMLFile, io.Transport.XHR);

  /**
   * Transport name
   *
   * @api public
   */

  HTMLFile.prototype.name = 'htmlfile';

  /**
   * Creates a new Ac...eX `htmlfile` with a forever loading iframe
   * that can be used to listen to messages. Inside the generated
   * `htmlfile` a reference will be made to the HTMLFile transport.
   *
   * @api private
   */

  HTMLFile.prototype.get = function () {
    this.doc = new window[(['Active'].concat('Object').join('X'))]('htmlfile');
    this.doc.open();
    this.doc.write('<html></html>');
    this.doc.close();
    this.doc.parentWindow.s = this;

    var iframeC = this.doc.createElement('div');
    iframeC.className = 'socketio';

    this.doc.body.appendChild(iframeC);
    this.iframe = this.doc.createElement('iframe');

    iframeC.appendChild(this.iframe);

    var self = this
      , query = io.util.query(this.socket.options.query, 't='+ +new Date);

    this.iframe.src = this.prepareUrl() + query;

    io.util.on(window, 'unload', function () {
      self.destroy();
    });
  };

  /**
   * The Socket.IO server will write script tags inside the forever
   * iframe, this function will be used as callback for the incoming
   * information.
   *
   * @param {String} data The message
   * @param {document} doc Reference to the context
   * @api private
   */

  HTMLFile.prototype._ = function (data, doc) {
    this.onData(data);
    try {
      var script = doc.getElementsByTagName('script')[0];
      script.parentNode.removeChild(script);
    } catch (e) { }
  };

  /**
   * Destroy the established connection, iframe and `htmlfile`.
   * And calls the `CollectGarbage` function of Internet Explorer
   * to release the memory.
   *
   * @api private
   */

  HTMLFile.prototype.destroy = function () {
    if (this.iframe){
      try {
        this.iframe.src = 'about:blank';
      } catch(e){}

      this.doc = null;
      this.iframe.parentNode.removeChild(this.iframe);
      this.iframe = null;

      CollectGarbage();
    }
  };

  /**
   * Disconnects the established connection.
   *
   * @returns {Transport} Chaining.
   * @api public
   */

  HTMLFile.prototype.close = function () {
    this.destroy();
    return io.Transport.XHR.prototype.close.call(this);
  };

  /**
   * Checks if the browser supports this transport. The browser
   * must have an `Ac...eXObject` implementation.
   *
   * @return {Boolean}
   * @api public
   */

  HTMLFile.check = function (socket) {
    if (typeof window != "undefined" && (['Active'].concat('Object').join('X')) in window){
      try {
        var a = new window[(['Active'].concat('Object').join('X'))]('htmlfile');
        return a && io.Transport.XHR.check(socket);
      } catch(e){}
    }
    return false;
  };

  /**
   * Check if cross domain requests are supported.
   *
   * @returns {Boolean}
   * @api public
   */

  HTMLFile.xdomainCheck = function () {
    // we can probably do handling for sub-domains, we should
    // test that it's cross domain but a subdomain here
    return false;
  };

  /**
   * Add the transport to your public io.transports array.
   *
   * @api private
   */

  io.transports.push('htmlfile');

})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io, global) {

  /**
   * Expose constructor.
   */

  exports['xhr-polling'] = XHRPolling;

  /**
   * The XHR-polling transport uses long polling XHR requests to create a
   * "persistent" connection with the server.
   *
   * @constructor
   * @api public
   */

  function XHRPolling () {
    io.Transport.XHR.apply(this, arguments);
  };

  /**
   * Inherits from XHR transport.
   */

  io.util.inherit(XHRPolling, io.Transport.XHR);

  /**
   * Merge the properties from XHR transport
   */

  io.util.merge(XHRPolling, io.Transport.XHR);

  /**
   * Transport name
   *
   * @api public
   */

  XHRPolling.prototype.name = 'xhr-polling';

  /**
   * Indicates whether heartbeats is enabled for this transport
   *
   * @api private
   */

  XHRPolling.prototype.heartbeats = function () {
    return false;
  };

  /** 
   * Establish a connection, for iPhone and Android this will be done once the page
   * is loaded.
   *
   * @returns {Transport} Chaining.
   * @api public
   */

  XHRPolling.prototype.open = function () {
    var self = this;

    io.Transport.XHR.prototype.open.call(self);
    return false;
  };

  /**
   * Starts a XHR request to wait for incoming messages.
   *
   * @api private
   */

  function empty () {};

  XHRPolling.prototype.get = function () {
    if (!this.isOpen) return;

    var self = this;

    function stateChange () {
      if (this.readyState == 4) {
        this.onreadystatechange = empty;

        if (this.status == 200) {
          self.onData(this.responseText);
          self.get();
        } else {
          self.onClose();
        }
      }
    };

    function onload () {
      this.onload = empty;
      this.onerror = empty;
      self.retryCounter = 1;
      self.onData(this.responseText);
      self.get();
    };

    function onerror () {
      self.retryCounter ++;
      if(!self.retryCounter || self.retryCounter > 3) {
        self.onClose();  
      } else {
        self.get();
      }
    };

    this.xhr = this.request();

    if (global.XDomainRequest && this.xhr instanceof XDomainRequest) {
      this.xhr.onload = onload;
      this.xhr.onerror = onerror;
    } else {
      this.xhr.onreadystatechange = stateChange;
    }

    this.xhr.send(null);
  };

  /**
   * Handle the unclean close behavior.
   *
   * @api private
   */

  XHRPolling.prototype.onClose = function () {
    io.Transport.XHR.prototype.onClose.call(this);

    if (this.xhr) {
      this.xhr.onreadystatechange = this.xhr.onload = this.xhr.onerror = empty;
      try {
        this.xhr.abort();
      } catch(e){}
      this.xhr = null;
    }
  };

  /**
   * Webkit based browsers show a infinit spinner when you start a XHR request
   * before the browsers onload event is called so we need to defer opening of
   * the transport until the onload event is called. Wrapping the cb in our
   * defer method solve this.
   *
   * @param {Socket} socket The socket instance that needs a transport
   * @param {Function} fn The callback
   * @api private
   */

  XHRPolling.prototype.ready = function (socket, fn) {
    var self = this;

    io.util.defer(function () {
      fn.call(self);
    });
  };

  /**
   * Add the transport to your public io.transports array.
   *
   * @api private
   */

  io.transports.push('xhr-polling');

})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
  , this
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io, global) {
  /**
   * There is a way to hide the loading indicator in Firefox. If you create and
   * remove a iframe it will stop showing the current loading indicator.
   * Unfortunately we can't feature detect that and UA sniffing is evil.
   *
   * @api private
   */

  var indicator = global.document && "MozAppearance" in
    global.document.documentElement.style;

  /**
   * Expose constructor.
   */

  exports['jsonp-polling'] = JSONPPolling;

  /**
   * The JSONP transport creates an persistent connection by dynamically
   * inserting a script tag in the page. This script tag will receive the
   * information of the Socket.IO server. When new information is received
   * it creates a new script tag for the new data stream.
   *
   * @constructor
   * @extends {io.Transport.xhr-polling}
   * @api public
   */

  function JSONPPolling (socket) {
    io.Transport['xhr-polling'].apply(this, arguments);

    this.index = io.j.length;

    var self = this;

    io.j.push(function (msg) {
      self._(msg);
    });
  };

  /**
   * Inherits from XHR polling transport.
   */

  io.util.inherit(JSONPPolling, io.Transport['xhr-polling']);

  /**
   * Transport name
   *
   * @api public
   */

  JSONPPolling.prototype.name = 'jsonp-polling';

  /**
   * Posts a encoded message to the Socket.IO server using an iframe.
   * The iframe is used because script tags can create POST based requests.
   * The iframe is positioned outside of the view so the user does not
   * notice it's existence.
   *
   * @param {String} data A encoded message.
   * @api private
   */

  JSONPPolling.prototype.post = function (data) {
    var self = this
      , query = io.util.query(
             this.socket.options.query
          , 't='+ (+new Date) + '&i=' + this.index
        );

    if (!this.form) {
      var form = document.createElement('form')
        , area = document.createElement('textarea')
        , id = this.iframeId = 'socketio_iframe_' + this.index
        , iframe;

      form.className = 'socketio';
      form.style.position = 'absolute';
      form.style.top = '0px';
      form.style.left = '0px';
      form.style.display = 'none';
      form.target = id;
      form.method = 'POST';
      form.setAttribute('accept-charset', 'utf-8');
      area.name = 'd';
      form.appendChild(area);
      document.body.appendChild(form);

      this.form = form;
      this.area = area;
    }

    this.form.action = this.prepareUrl() + query;

    function complete () {
      initIframe();
      self.socket.setBuffer(false);
    };

    function initIframe () {
      if (self.iframe) {
        self.form.removeChild(self.iframe);
      }

      try {
        // ie6 dynamic iframes with target="" support (thanks Chris Lambacher)
        iframe = document.createElement('<iframe name="'+ self.iframeId +'">');
      } catch (e) {
        iframe = document.createElement('iframe');
        iframe.name = self.iframeId;
      }

      iframe.id = self.iframeId;

      self.form.appendChild(iframe);
      self.iframe = iframe;
    };

    initIframe();

    // we temporarily stringify until we figure out how to prevent
    // browsers from turning `\n` into `\r\n` in form inputs
    this.area.value = io.JSON.stringify(data);

    try {
      this.form.submit();
    } catch(e) {}

    if (this.iframe.attachEvent) {
      iframe.onreadystatechange = function () {
        if (self.iframe.readyState == 'complete') {
          complete();
        }
      };
    } else {
      this.iframe.onload = complete;
    }

    this.socket.setBuffer(true);
  };

  /**
   * Creates a new JSONP poll that can be used to listen
   * for messages from the Socket.IO server.
   *
   * @api private
   */

  JSONPPolling.prototype.get = function () {
    var self = this
      , script = document.createElement('script')
      , query = io.util.query(
             this.socket.options.query
          , 't='+ (+new Date) + '&i=' + this.index
        );

    if (this.script) {
      this.script.parentNode.removeChild(this.script);
      this.script = null;
    }

    script.async = true;
    script.src = this.prepareUrl() + query;
    script.onerror = function () {
      self.onClose();
    };

    var insertAt = document.getElementsByTagName('script')[0];
    insertAt.parentNode.insertBefore(script, insertAt);
    this.script = script;

    if (indicator) {
      setTimeout(function () {
        var iframe = document.createElement('iframe');
        document.body.appendChild(iframe);
        document.body.removeChild(iframe);
      }, 100);
    }
  };

  /**
   * Callback function for the incoming message stream from the Socket.IO server.
   *
   * @param {String} data The message
   * @api private
   */

  JSONPPolling.prototype._ = function (msg) {
    this.onData(msg);
    if (this.isOpen) {
      this.get();
    }
    return this;
  };

  /**
   * The indicator hack only works after onload
   *
   * @param {Socket} socket The socket instance that needs a transport
   * @param {Function} fn The callback
   * @api private
   */

  JSONPPolling.prototype.ready = function (socket, fn) {
    var self = this;
    if (!indicator) return fn.call(this);

    io.util.load(function () {
      fn.call(self);
    });
  };

  /**
   * Checks if browser supports this transport.
   *
   * @return {Boolean}
   * @api public
   */

  JSONPPolling.check = function () {
    return 'document' in global;
  };

  /**
   * Check if cross domain requests are supported
   *
   * @returns {Boolean}
   * @api public
   */

  JSONPPolling.xdomainCheck = function () {
    return true;
  };

  /**
   * Add the transport to your public io.transports array.
   *
   * @api private
   */

  io.transports.push('jsonp-polling');

})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
  , this
);

if (typeof define === "function" && define.amd) {
  define([], function () { return io; });
}
})();
function UserAgentEntity()
{

   /* Public property for the field Type */
   this.type;

   this.write = function(writer)
   {
      writer.writeString(this.type);
   };


   this.read = function(reader)
   {
      this.type = reader.readString();
   };

};

function RCRootEntity()
{

   /* Public property for the field Variables */
   this.variables;

   /* Public property for the field Resources */
   this.resources;

   /* Public property for the field Elements */
   this.elements;

   this.write = function(writer)
   {
      writer.writeArray(this.variables);
      writer.writeArray(this.resources);
      writer.writeArray(this.elements);
   };


   this.read = function(reader)
   {
      this.variables = reader.readArrayOfEntity('RCVariableEntity');
      this.resources = reader.readArrayOfEntity('RCResourceEntity');
      this.elements = reader.readArrayOfEntity('RCElementEntity');
   };

};

function RCVariableEntity()
{

   /* Public property for the field Name */
   this.name;

   /* Public property for the field Value */
   this.value;

   this.write = function(writer)
   {
      writer.writeString(this.name);
      writer.writeDynamic(this.value);
   };


   this.read = function(reader)
   {
      this.name = reader.readString();
      this.value = reader.readDynamic();
   };

};

function RCResourceEntity()
{

   /* Public property for the field Name */
   this.name;

   /* Public property for the field Type */
   this.type;

   /* Public property for the field ResourceId */
   this.resourceId;

   this.write = function(writer)
   {
      writer.writeString(this.name);
      writer.writeInt32(this.type);
      writer.writeInt32(this.resourceId);
   };


   this.read = function(reader)
   {
      this.name = reader.readString();
      this.type = reader.readInt32();
      this.resourceId = reader.readInt32();
   };

};

function RCElementEntity()
{

   /* Public property for the field Name */
   this.name;

   /* Public property for the field Parent */
   this.parent;

   /* Public property for the field Type */
   this.type;

   /* Public property for the field Frame */
   this.frame;

   /* Public property for the field Enabled */
   this.enabled;

   /* Public property for the field Visible */
   this.visible;

   /* Public property for the field StyleName */
   this.styleName;

   /* Public property for the field Hooks */
   this.hooks;

   this.write = function(writer)
   {
      writer.writeString(this.name);
      writer.writeString(this.parent);
      writer.writeInt32(this.type);
      writer.writeEntity(this.frame);
      writer.writeBoolean(this.enabled);
      writer.writeBoolean(this.visible);
      writer.writeString(this.styleName);
      writer.writeArray(this.hooks);
   };


   this.read = function(reader)
   {
      this.name = reader.readString();
      this.parent = reader.readString();
      this.type = reader.readInt32();
      this.frame = new RCFrameEntity();
      reader.readEntity(this.frame);
      this.enabled = reader.readBoolean();
      this.visible = reader.readBoolean();
      this.styleName = reader.readString();
      this.hooks = reader.readArrayOfEntity('RCControlHookEntity');
   };

};

function RCFrameEntity()
{

   /* Public property for the field X */
   this.x;

   /* Public property for the field Y */
   this.y;

   /* Public property for the field Z */
   this.z;

   /* Public property for the field Width */
   this.width;

   /* Public property for the field Heigth */
   this.heigth;

   this.write = function(writer)
   {
      writer.writeInt16(this.x);
      writer.writeInt16(this.y);
      writer.writeInt16(this.z);
      writer.writeInt16(this.width);
      writer.writeInt16(this.heigth);
   };


   this.read = function(reader)
   {
      this.x = reader.readInt16();
      this.y = reader.readInt16();
      this.z = reader.readInt16();
      this.width = reader.readInt16();
      this.heigth = reader.readInt16();
   };

};

function RCControlHookEntity()
{

   /* Public property for the field Name */
   this.name;

   /* Public property for the field Type */
   this.type;

   /* Public property for the field Body */
   this.body;

   this.write = function(writer)
   {
      writer.writeString(this.name);
      writer.writeInt32(this.type);
      writer.writeString(this.body);
   };


   this.read = function(reader)
   {
      this.name = reader.readString();
      this.type = reader.readInt32();
      this.body = reader.readString();
   };

};

function UserAgentOptionsEntity()
{

   /* Public property for the field ContentDeliveryUri */
   this.contentDeliveryUri;

   this.write = function(writer)
   {
      writer.writeString(this.contentDeliveryUri);
   };


   this.read = function(reader)
   {
      this.contentDeliveryUri = reader.readString();
   };

};

function GetStageRequest()
{

   /* Public property for the field OldStageInstance */
   this.oldStageInstance;

   /* Public property for the field NewStageInstance */
   this.newStageInstance;

   /* Public property for the field Parameter */
   this.parameter;

   /* Public property for the field PreloadOnly */
   this.preloadOnly;

   this.write = function(writer)
   {
      writer.writeInt32(this.oldStageInstance);
      writer.writeInt32(this.newStageInstance);
      writer.writeString(this.parameter);
      writer.writeBoolean(this.preloadOnly);
   };


   this.read = function(reader)
   {
      reader.decompress();
      this.oldStageInstance = reader.readInt32();
      this.newStageInstance = reader.readInt32();
      this.parameter = reader.readString();
      this.preloadOnly = reader.readBoolean();
   };

};

function RecoverFromConnectionLostRequest()
{

   /* Public property for the field GameConnectionID */
   this.gameConnectionID;

   /* Public property for the field DeviceID */
   this.deviceID;

   this.write = function(writer)
   {
      writer.writeString(this.gameConnectionID);
      writer.writeString(this.deviceID);
   };


   this.read = function(reader)
   {
      this.gameConnectionID = reader.readString();
      this.deviceID = reader.readString();
   };

};

function StageResponseRequest()
{

   /* Public property for the field StageInstance */
   this.stageInstance;

   /* Public property for the field ElementName */
   this.elementName;

   this.write = function(writer)
   {
      writer.writeInt32(this.stageInstance);
      writer.writeString(this.elementName);
   };


   this.read = function(reader)
   {
      this.stageInstance = reader.readInt32();
      this.elementName = reader.readString();
   };

};

function GetUserAgentOptionsRequest()
{

   /* Public property for the field UserAgent */
   this.userAgent;

   this.write = function(writer)
   {
      writer.writeEntity(this.userAgent);
   };


   this.read = function(reader)
   {
      this.userAgent = new UserAgentEntity();
      reader.readEntity(this.userAgent);
   };

};

function AttachControllerRequest()
{

   /* Public property for the field Token */
   this.token;

   this.write = function(writer)
   {
      writer.writeString(this.token);
   };


   this.read = function(reader)
   {
      this.token = reader.readString();
   };

};

function SetClientTypeRequest()
{

   /* Public property for the field ClientType */
   this.clientType;

   this.write = function(writer)
   {
      writer.writeString(this.clientType);
   };


   this.read = function(reader)
   {
      this.clientType = reader.readString();
   };

};

function GetStageInform()
{

   /* Public property for the field StageInstance */
   this.stageInstance;

   /* Public property for the field PreloadOnly */
   this.preloadOnly;

   /* Public property for the field AutoRunMovieClips */
   this.autoRunMovieClips;

   /* Public property for the field Root */
   this.root;

   this.write = function(writer)
   {
      writer.writeInt32(this.stageInstance);
      writer.writeBoolean(this.preloadOnly);
      writer.writeBoolean(this.autoRunMovieClips);
      writer.writeEntity(this.root);
   };


   this.read = function(reader)
   {
      reader.decompress();
      this.stageInstance = reader.readInt32();
      this.preloadOnly = reader.readBoolean();
      this.autoRunMovieClips = reader.readBoolean();
      this.root = new RCRootEntity();
      reader.readEntity(this.root);
   };

};

function RecoverFromConnectionLostInform()
{

   /* Public property for the field Success */
   this.success;

   this.write = function(writer)
   {
      writer.writeBoolean(this.success);
   };


   this.read = function(reader)
   {
      this.success = reader.readBoolean();
   };

};

function StageUpdateInform()
{

   /* Public property for the field StageInstance */
   this.stageInstance;

   /* Public property for the field Script */
   this.script;

   this.write = function(writer)
   {
      writer.writeInt32(this.stageInstance);
      writer.writeString(this.script);
   };


   this.read = function(reader)
   {
      reader.decompress();
      this.stageInstance = reader.readInt32();
      this.script = reader.readString();
   };

};

function CreateScriptInform()
{

   /* Public property for the field StageInstance */
   this.stageInstance;

   /* Public property for the field Name */
   this.name;

   /* Public property for the field Script */
   this.script;

   this.write = function(writer)
   {
      writer.writeInt32(this.stageInstance);
      writer.writeString(this.name);
      writer.writeString(this.script);
   };


   this.read = function(reader)
   {
      this.stageInstance = reader.readInt32();
      this.name = reader.readString();
      this.script = reader.readString();
   };

};

function GetUserAgentOptionsInform()
{

   /* Public property for the field UserAgentOptions */
   this.userAgentOptions;

   this.write = function(writer)
   {
      writer.writeEntity(this.userAgentOptions);
   };


   this.read = function(reader)
   {
      this.userAgentOptions = new UserAgentOptionsEntity();
      reader.readEntity(this.userAgentOptions);
   };

};

function AttachControllerInform()
{

   /* Public property for the field Success */
   this.success;

   this.write = function(writer)
   {
      writer.writeBoolean(this.success);
   };


   this.read = function(reader)
   {
      this.success = reader.readBoolean();
   };

};

function SetClientTypeInform()
{

   /* Public property for the field Success */
   this.success;

   this.write = function(writer)
   {
      writer.writeBoolean(this.success);
   };


   this.read = function(reader)
   {
      this.success = reader.readBoolean();
   };

};

function AddCreditRequest()
{

   /* Public property for the field Id */
   this.id;

   /* Public property for the field Amount */
   this.amount;

   this.write = function(writer)
   {
      writer.writeString(this.id);
      writer.writeInt32(this.amount);
   };


   this.read = function(reader)
   {
      this.id = reader.readString();
      this.amount = reader.readInt32();
   };

};

function CollectCreditRequest()
{

   /* Public property for the field Id */
   this.id;

   this.write = function(writer)
   {
      writer.writeString(this.id);
   };


   this.read = function(reader)
   {
      this.id = reader.readString();
   };

};

function RemoveCreditRequest()
{

   /* Public property for the field Id */
   this.id;

   /* Public property for the field Amount */
   this.amount;

   this.write = function(writer)
   {
      writer.writeString(this.id);
      writer.writeInt32(this.amount);
   };


   this.read = function(reader)
   {
      this.id = reader.readString();
      this.amount = reader.readInt32();
   };

};

function CreateSessionRequest()
{

   /* Public property for the field GameName */
   this.gameName;

   this.write = function(writer)
   {
      writer.writeString(this.gameName);
   };


   this.read = function(reader)
   {
      this.gameName = reader.readString();
   };

};

function GetSoftwareChecksumRequest()
{

   /* Public property for the field Key */
   this.key;

   this.write = function(writer)
   {
      writer.writeString(this.key);
   };


   this.read = function(reader)
   {
      this.key = reader.readString();
   };

};

function SynchronizeRTCRequest()
{

   /* Public property for the field Time */
   this.time;

   this.write = function(writer)
   {
      writer.writeDateTime(this.time);
   };


   this.read = function(reader)
   {
      this.time = reader.readDateTime();
   };

};

function ComputeMachineStatisticsRequest()
{

   /* Public property for the field PeriodStart */
   this.periodStart;

   this.write = function(writer)
   {
      writer.writeDateTime(this.periodStart);
   };


   this.read = function(reader)
   {
      this.periodStart = reader.readDateTime();
   };

};

function ComputeGameStatisticsRequest()
{

   /* Public property for the field PeriodStart */
   this.periodStart;

   /* Public property for the field GameName */
   this.gameName;

   this.write = function(writer)
   {
      writer.writeDateTime(this.periodStart);
      writer.writeString(this.gameName);
   };


   this.read = function(reader)
   {
      this.periodStart = reader.readDateTime();
      this.gameName = reader.readString();
   };

};

function AddCreditInform()
{

   /* Public property for the field Id */
   this.id;

   /* Public property for the field Success */
   this.success;

   /* Public property for the field Status */
   this.status;

   /* Public property for the field ErrorMessage */
   this.errorMessage;

   this.write = function(writer)
   {
      writer.writeString(this.id);
      writer.writeBoolean(this.success);
      writer.writeString(this.status);
      writer.writeString(this.errorMessage);
   };


   this.read = function(reader)
   {
      this.id = reader.readString();
      this.success = reader.readBoolean();
      this.status = reader.readString();
      this.errorMessage = reader.readString();
   };

};

function UpdateGameCreditsInform()
{

   /* Public property for the field Success */
   this.success;

   /* Public property for the field NewAmount */
   this.newAmount;

   this.write = function(writer)
   {
      writer.writeBoolean(this.success);
      writer.writeInt32(this.newAmount);
   };


   this.read = function(reader)
   {
      this.success = reader.readBoolean();
      this.newAmount = reader.readInt32();
   };

};

function CollectCreditInform()
{

   /* Public property for the field Id */
   this.id;

   /* Public property for the field Success */
   this.success;

   /* Public property for the field Amount */
   this.amount;

   this.write = function(writer)
   {
      writer.writeString(this.id);
      writer.writeBoolean(this.success);
      writer.writeInt32(this.amount);
   };


   this.read = function(reader)
   {
      this.id = reader.readString();
      this.success = reader.readBoolean();
      this.amount = reader.readInt32();
   };

};

function RemoveCreditInform()
{

   /* Public property for the field Id */
   this.id;

   /* Public property for the field Success */
   this.success;

   this.write = function(writer)
   {
      writer.writeString(this.id);
      writer.writeBoolean(this.success);
   };


   this.read = function(reader)
   {
      this.id = reader.readString();
      this.success = reader.readBoolean();
   };

};

function KeepAliveInform()
{

   /* Public property for the field Success */
   this.success;

   this.write = function(writer)
   {
      writer.writeBoolean(this.success);
   };


   this.read = function(reader)
   {
      this.success = reader.readBoolean();
   };

};

function CreateSessionInform()
{

   /* Public property for the field Success */
   this.success;

   /* Public property for the field GameConnectionID */
   this.gameConnectionID;

   /* Public property for the field Status */
   this.status;

   this.write = function(writer)
   {
      writer.writeBoolean(this.success);
      writer.writeString(this.gameConnectionID);
      writer.writeString(this.status);
   };


   this.read = function(reader)
   {
      this.success = reader.readBoolean();
      this.gameConnectionID = reader.readString();
      this.status = reader.readString();
   };

};

function CloseSessionInform()
{

   /* Public property for the field Success */
   this.success;

   this.write = function(writer)
   {
      writer.writeBoolean(this.success);
   };


   this.read = function(reader)
   {
      this.success = reader.readBoolean();
   };

};

function RecoverRunningGameInform()
{

   /* Public property for the field Success */
   this.success;

   /* Public property for the field Status */
   this.status;

   /* Public property for the field GameConnectionID */
   this.gameConnectionID;

   /* Public property for the field RecoveredGameName */
   this.recoveredGameName;

   this.write = function(writer)
   {
      writer.writeBoolean(this.success);
      writer.writeString(this.status);
      writer.writeString(this.gameConnectionID);
      writer.writeString(this.recoveredGameName);
   };


   this.read = function(reader)
   {
      this.success = reader.readBoolean();
      this.status = reader.readString();
      this.gameConnectionID = reader.readString();
      this.recoveredGameName = reader.readString();
   };

};

function GetInterruptsInform()
{

   /* Public property for the field interrupts */
   this.interrupts;

   this.write = function(writer)
   {
      writer.writeInt32(this.interrupts);
   };


   this.read = function(reader)
   {
      this.interrupts = reader.readInt32();
   };

};

function GetGameSoftwareVersionInform()
{

   /* Public property for the field GameSoftwareVersion */
   this.gameSoftwareVersion;

   this.write = function(writer)
   {
      writer.writeString(this.gameSoftwareVersion);
   };


   this.read = function(reader)
   {
      this.gameSoftwareVersion = reader.readString();
   };

};

function GetCreditInInform()
{

   /* Public property for the field CreditIn */
   this.creditIn;

   this.write = function(writer)
   {
      writer.writeDouble(this.creditIn);
   };


   this.read = function(reader)
   {
      this.creditIn = reader.readDouble();
   };

};

function GetChangeInInform()
{

   /* Public property for the field ChangeIn */
   this.changeIn;

   this.write = function(writer)
   {
      writer.writeDouble(this.changeIn);
   };


   this.read = function(reader)
   {
      this.changeIn = reader.readDouble();
   };

};

function GetCreditOutInform()
{

   /* Public property for the field CreditOut */
   this.creditOut;

   this.write = function(writer)
   {
      writer.writeDouble(this.creditOut);
   };


   this.read = function(reader)
   {
      this.creditOut = reader.readDouble();
   };

};

function GetChangeOutInform()
{

   /* Public property for the field ChangeOut */
   this.changeOut;

   this.write = function(writer)
   {
      writer.writeDouble(this.changeOut);
   };


   this.read = function(reader)
   {
      this.changeOut = reader.readDouble();
   };

};

function GetBetsInform()
{

   /* Public property for the field Bets */
   this.bets;

   this.write = function(writer)
   {
      writer.writeDouble(this.bets);
   };


   this.read = function(reader)
   {
      this.bets = reader.readDouble();
   };

};

function GetWinsInform()
{

   /* Public property for the field Wins */
   this.wins;

   this.write = function(writer)
   {
      writer.writeDouble(this.wins);
   };


   this.read = function(reader)
   {
      this.wins = reader.readDouble();
   };

};

function GetGamesInform()
{

   /* Public property for the field Games */
   this.games;

   this.write = function(writer)
   {
      writer.writeInt32(this.games);
   };


   this.read = function(reader)
   {
      this.games = reader.readInt32();
   };

};

function GetCurrentCreditsInform()
{

   /* Public property for the field CurrentCredits */
   this.currentCredits;

   this.write = function(writer)
   {
      writer.writeDouble(this.currentCredits);
   };


   this.read = function(reader)
   {
      this.currentCredits = reader.readDouble();
   };

};

function GetMetrologyApprobationNumberInform()
{

   /* Public property for the field MetrologyApprobationNumber */
   this.metrologyApprobationNumber;

   this.write = function(writer)
   {
      writer.writeString(this.metrologyApprobationNumber);
   };


   this.read = function(reader)
   {
      this.metrologyApprobationNumber = reader.readString();
   };

};

function GetGameSerialNumberInform()
{

   /* Public property for the field GameSerialNumber */
   this.gameSerialNumber;

   this.write = function(writer)
   {
      writer.writeString(this.gameSerialNumber);
   };


   this.read = function(reader)
   {
      this.gameSerialNumber = reader.readString();
   };

};

function GetSoftwareChecksumInform()
{

   /* Public property for the field SoftwareChecksum */
   this.softwareChecksum;

   this.write = function(writer)
   {
      writer.writeString(this.softwareChecksum);
   };


   this.read = function(reader)
   {
      this.softwareChecksum = reader.readString();
   };

};

function ComputeMachineStatisticsInform()
{

   /* Public property for the field PeriodStart */
   this.periodStart;

   /* Public property for the field CoinIn */
   this.coinIn;

   /* Public property for the field CoinOut */
   this.coinOut;

   /* Public property for the field RetribHold */
   this.retribHold;

   /* Public property for the field RetribYield */
   this.retribYield;

   this.write = function(writer)
   {
      writer.writeDateTime(this.periodStart);
      writer.writeString(this.coinIn);
      writer.writeString(this.coinOut);
      writer.writeString(this.retribHold);
      writer.writeString(this.retribYield);
   };


   this.read = function(reader)
   {
      this.periodStart = reader.readDateTime();
      this.coinIn = reader.readString();
      this.coinOut = reader.readString();
      this.retribHold = reader.readString();
      this.retribYield = reader.readString();
   };

};

function ComputeGameStatisticsInform()
{

   /* Public property for the field PeriodStart */
   this.periodStart;

   /* Public property for the field GameName */
   this.gameName;

   /* Public property for the field CoinIn */
   this.coinIn;

   /* Public property for the field CoinOut */
   this.coinOut;

   /* Public property for the field RetribHold */
   this.retribHold;

   /* Public property for the field RetribYield */
   this.retribYield;

   /* Public property for the field RetribTarget */
   this.retribTarget;

   /* Public property for the field TotalGamePlayed */
   this.totalGamePlayed;

   /* Public property for the field TotalGameWon */
   this.totalGameWon;

   /* Public property for the field TotalGameLost */
   this.totalGameLost;

   this.write = function(writer)
   {
      writer.writeDateTime(this.periodStart);
      writer.writeString(this.gameName);
      writer.writeString(this.coinIn);
      writer.writeString(this.coinOut);
      writer.writeString(this.retribHold);
      writer.writeString(this.retribYield);
      writer.writeString(this.retribTarget);
      writer.writeInt32(this.totalGamePlayed);
      writer.writeInt32(this.totalGameWon);
      writer.writeInt32(this.totalGameLost);
   };


   this.read = function(reader)
   {
      this.periodStart = reader.readDateTime();
      this.gameName = reader.readString();
      this.coinIn = reader.readString();
      this.coinOut = reader.readString();
      this.retribHold = reader.readString();
      this.retribYield = reader.readString();
      this.retribTarget = reader.readString();
      this.totalGamePlayed = reader.readInt32();
      this.totalGameWon = reader.readInt32();
      this.totalGameLost = reader.readInt32();
   };

};

function SupplyCredentialsRequest()
{

   /* Public property for the field CredentialsUri */
   this.credentialsUri;

   /* Public property for the field CredentialsType */
   this.credentialsType;

   /* Public property for the field UserName */
   this.userName;

   /* Public property for the field Password */
   this.password;

   /* Public property for the field Domain */
   this.domain;

   this.write = function(writer)
   {
      writer.writeString(this.credentialsUri);
      writer.writeString(this.credentialsType);
      writer.writeString(this.userName);
      writer.writeString(this.password);
      writer.writeString(this.domain);
      writer.compress();
   };


   this.read = function(reader)
   {
      this.credentialsUri = reader.readString();
      this.credentialsType = reader.readString();
      this.userName = reader.readString();
      this.password = reader.readString();
      this.domain = reader.readString();
   };

};

function RevokeCredentialsRequest()
{

   /* Public property for the field CredentialsUri */
   this.credentialsUri;

   /* Public property for the field CredentialsType */
   this.credentialsType;

   this.write = function(writer)
   {
      writer.writeString(this.credentialsUri);
      writer.writeString(this.credentialsType);
      writer.compress();
   };


   this.read = function(reader)
   {
      this.credentialsUri = reader.readString();
      this.credentialsType = reader.readString();
   };

};

function HubSubscribeRequest()
{

   /* Public property for the field HubName */
   this.hubName;

   /* Public property for the field SubscribeKey */
   this.subscribeKey;

   this.write = function(writer)
   {
      writer.writeString(this.hubName);
      writer.writeString(this.subscribeKey);
      writer.compress();
   };


   this.read = function(reader)
   {
      this.hubName = reader.readString();
      this.subscribeKey = reader.readString();
   };

};

function HubUnsubscribeRequest()
{

   /* Public property for the field HubName */
   this.hubName;

   /* Public property for the field SubscribeKey */
   this.subscribeKey;

   this.write = function(writer)
   {
      writer.writeString(this.hubName);
      writer.writeString(this.subscribeKey);
      writer.compress();
   };


   this.read = function(reader)
   {
      this.hubName = reader.readString();
      this.subscribeKey = reader.readString();
   };

};

function HubPublishRequest()
{

   /* Public property for the field HubName */
   this.hubName;

   /* Public property for the field PublishKey */
   this.publishKey;

   /* Public property for the field Message */
   this.message;

   this.write = function(writer)
   {
      writer.writeString(this.hubName);
      writer.writeString(this.publishKey);
      writer.writeString(this.message);
      writer.compress();
   };


   this.read = function(reader)
   {
      this.hubName = reader.readString();
      this.publishKey = reader.readString();
      this.message = reader.readString();
   };

};

function PingInform()
{

   /* Public property for the field Pong */
   this.pong;

   this.write = function(writer)
   {
      writer.writeBoolean(this.pong);
   };


   this.read = function(reader)
   {
      this.pong = reader.readBoolean();
   };

};

function GetServerTimeInform()
{

   /* Public property for the field ServerTime */
   this.serverTime;

   this.write = function(writer)
   {
      writer.writeDateTime(this.serverTime);
   };


   this.read = function(reader)
   {
      reader.decompress();
      this.serverTime = reader.readDateTime();
   };

};

function SupplyCredentialsInform()
{

   /* Public property for the field Result */
   this.result;

   this.write = function(writer)
   {
      writer.writeBoolean(this.result);
      writer.compress();
   };


   this.read = function(reader)
   {
      this.result = reader.readBoolean();
   };

};

function RevokeCredentialsInform()
{

   /* Public property for the field Result */
   this.result;

   this.write = function(writer)
   {
      writer.writeBoolean(this.result);
      writer.compress();
   };


   this.read = function(reader)
   {
      this.result = reader.readBoolean();
   };

};

function HubSubscribeInform()
{

   /* Public property for the field Status */
   this.status;

   this.write = function(writer)
   {
      writer.writeInt16(this.status);
      writer.compress();
   };


   this.read = function(reader)
   {
      this.status = reader.readInt16();
   };

};

function HubUnsubscribeInform()
{

   /* Public property for the field Status */
   this.status;

   this.write = function(writer)
   {
      writer.writeInt16(this.status);
      writer.compress();
   };


   this.read = function(reader)
   {
      this.status = reader.readInt16();
   };

};

function HubPublishInform()
{

   /* Public property for the field Status */
   this.status;

   this.write = function(writer)
   {
      writer.writeInt16(this.status);
      writer.compress();
   };


   this.read = function(reader)
   {
      this.status = reader.readInt16();
   };

};

function HubEventInform()
{

   /* Public property for the field HubName */
   this.hubName;

   /* Public property for the field Message */
   this.message;

   /* Public property for the field Time */
   this.time;

   this.write = function(writer)
   {
      writer.writeString(this.hubName);
      writer.writeString(this.message);
      writer.writeDateTime(this.time);
   };


   this.read = function(reader)
   {
      reader.decompress();
      this.hubName = reader.readString();
      this.message = reader.readString();
      this.time = reader.readDateTime();
   };

};

function OperationReader()
{
   /* This method is generated and called automatically, allows read operation calls */
   this.read = function(operation, reader)
   {
      switch (operation)
      {
         case "06C63B75":
         var packet06C63B75 = new HubUnsubscribeInform();
         packet06C63B75.read(reader);
         return packet06C63B75;
         case "0AFBBBC8":
         var packet0AFBBBC8 = new GetCreditOutInform();
         packet0AFBBBC8.read(reader);
         return packet0AFBBBC8;
         case "0ED3C2EB":
         var packet0ED3C2EB = new GetMetrologyApprobationNumberInform();
         packet0ED3C2EB.read(reader);
         return packet0ED3C2EB;
         case "103381EB":
         var packet103381EB = new GetChangeInInform();
         packet103381EB.read(reader);
         return packet103381EB;
         case "13CACE4B":
         var packet13CACE4B = new SetClientTypeInform();
         packet13CACE4B.read(reader);
         return packet13CACE4B;
         case "145E723E":
         var packet145E723E = new GetStageInform();
         packet145E723E.read(reader);
         return packet145E723E;
         case "15487F1A":
         var packet15487F1A = new GetCurrentCreditsInform();
         packet15487F1A.read(reader);
         return packet15487F1A;
         case "198D5019":
         var packet198D5019 = new AddCreditInform();
         packet198D5019.read(reader);
         return packet198D5019;
         case "26792C94":
         var packet26792C94 = new PingInform();
         packet26792C94.read(reader);
         return packet26792C94;
         case "2DD19B9B":
         var packet2DD19B9B = new HubSubscribeInform();
         packet2DD19B9B.read(reader);
         return packet2DD19B9B;
         case "33DD402A":
         var packet33DD402A = new KeepAliveInform();
         packet33DD402A.read(reader);
         return packet33DD402A;
         case "33E7FBD1":
         var packet33E7FBD1 = new GetServerTimeInform();
         packet33E7FBD1.read(reader);
         return packet33E7FBD1;
         case "349C9B48":
         var packet349C9B48 = new GetGameSoftwareVersionInform();
         packet349C9B48.read(reader);
         return packet349C9B48;
         case "37D78880":
         var packet37D78880 = new GetUserAgentOptionsInform();
         packet37D78880.read(reader);
         return packet37D78880;
         case "3B0C7065":
         var packet3B0C7065 = new AttachControllerInform();
         packet3B0C7065.read(reader);
         return packet3B0C7065;
         case "43FE88F2":
         var packet43FE88F2 = new GetGamesInform();
         packet43FE88F2.read(reader);
         return packet43FE88F2;
         case "48DAAD27":
         var packet48DAAD27 = new UpdateGameCreditsInform();
         packet48DAAD27.read(reader);
         return packet48DAAD27;
         case "4AC51818":
         var packet4AC51818 = new RevokeCredentialsInform();
         packet4AC51818.read(reader);
         return packet4AC51818;
         case "4D1490E0":
         var packet4D1490E0 = new CreateSessionInform();
         packet4D1490E0.read(reader);
         return packet4D1490E0;
         case "5C59F463":
         var packet5C59F463 = new GetInterruptsInform();
         packet5C59F463.read(reader);
         return packet5C59F463;
         case "65B2818C":
         var packet65B2818C = new HubEventInform();
         packet65B2818C.read(reader);
         return packet65B2818C;
         case "694B6559":
         var packet694B6559 = new GetSoftwareChecksumInform();
         packet694B6559.read(reader);
         return packet694B6559;
         case "82E2177E":
         var packet82E2177E = new GetCreditInInform();
         packet82E2177E.read(reader);
         return packet82E2177E;
         case "882E6204":
         var packet882E6204 = new StageUpdateInform();
         packet882E6204.read(reader);
         return packet882E6204;
         case "8A6F61B5":
         var packet8A6F61B5 = new GetChangeOutInform();
         packet8A6F61B5.read(reader);
         return packet8A6F61B5;
         case "8D98E9FC":
         var packet8D98E9FC = new SupplyCredentialsInform();
         packet8D98E9FC.read(reader);
         return packet8D98E9FC;
         case "924F7330":
         var packet924F7330 = new CreateScriptInform();
         packet924F7330.read(reader);
         return packet924F7330;
         case "96B41079":
         var packet96B41079 = new HubPublishInform();
         packet96B41079.read(reader);
         return packet96B41079;
         case "9A174CCE":
         var packet9A174CCE = new ComputeMachineStatisticsInform();
         packet9A174CCE.read(reader);
         return packet9A174CCE;
         case "9B354383":
         var packet9B354383 = new GetGameSerialNumberInform();
         packet9B354383.read(reader);
         return packet9B354383;
         case "BC0E510A":
         var packetBC0E510A = new RecoverRunningGameInform();
         packetBC0E510A.read(reader);
         return packetBC0E510A;
         case "C0B104FE":
         var packetC0B104FE = new ComputeGameStatisticsInform();
         packetC0B104FE.read(reader);
         return packetC0B104FE;
         case "C4FF5EB4":
         var packetC4FF5EB4 = new RemoveCreditInform();
         packetC4FF5EB4.read(reader);
         return packetC4FF5EB4;
         case "E0E1FC5B":
         var packetE0E1FC5B = new CloseSessionInform();
         packetE0E1FC5B.read(reader);
         return packetE0E1FC5B;
         case "E10CF174":
         var packetE10CF174 = new GetWinsInform();
         packetE10CF174.read(reader);
         return packetE10CF174;
         case "E16A8053":
         var packetE16A8053 = new RecoverFromConnectionLostInform();
         packetE16A8053.read(reader);
         return packetE16A8053;
         case "EE5D1EFC":
         var packetEE5D1EFC = new GetBetsInform();
         packetEE5D1EFC.read(reader);
         return packetEE5D1EFC;
         case "F99FE68C":
         var packetF99FE68C = new CollectCreditInform();
         packetF99FE68C.read(reader);
         return packetF99FE68C;
      }
      return null;
   }
};

function ServerChannel(endPoint)
{
   /* Server EndPoint url */
   this.endPoint = endPoint;

   /* 'Socket' object to use for all communication */
   this.socket = new ServerSocket(this);

   /* Operation reader */
   this.operationReader = new OperationReader();

   /* Connects to the server */
   this.connect = function()
   {
      this.socket.connect();
   };

   /* Sends a packet to the server */
   this.send = function(operationNumber, packet)
   {
      var writer = new PacketWriter();
      if(packet != null)
      {
         writer.writePacket(packet);
      }
      this.socket.send(operationNumber, writer);
   };
   /* Event: invoked when the HubUnsubscribe inform is received from the server */
   this.hubUnsubscribeInform = null;

   /* Event: invoked when the GetCreditOut inform is received from the server */
   this.getCreditOutInform = null;

   /* Event: invoked when the GetMetrologyApprobationNumber inform is received from the server */
   this.getMetrologyApprobationNumberInform = null;

   /* Event: invoked when the GetChangeIn inform is received from the server */
   this.getChangeInInform = null;

   /* Event: invoked when the SetClientType inform is received from the server */
   this.setClientTypeInform = null;

   /* Event: invoked when the GetStage inform is received from the server */
   this.getStageInform = null;

   /* Event: invoked when the GetCurrentCredits inform is received from the server */
   this.getCurrentCreditsInform = null;

   /* Event: invoked when the AddCredit inform is received from the server */
   this.addCreditInform = null;

   /* Event: invoked when the Ping inform is received from the server */
   this.pingInform = null;

   /* Event: invoked when the HubSubscribe inform is received from the server */
   this.hubSubscribeInform = null;

   /* Event: invoked when the KeepAlive inform is received from the server */
   this.keepAliveInform = null;

   /* Event: invoked when the GetServerTime inform is received from the server */
   this.getServerTimeInform = null;

   /* Event: invoked when the GetGameSoftwareVersion inform is received from the server */
   this.getGameSoftwareVersionInform = null;

   /* Event: invoked when the GetUserAgentOptions inform is received from the server */
   this.getUserAgentOptionsInform = null;

   /* Event: invoked when the AttachController inform is received from the server */
   this.attachControllerInform = null;

   /* Event: invoked when the GetGames inform is received from the server */
   this.getGamesInform = null;

   /* Event: invoked when the UpdateGameCredits inform is received from the server */
   this.updateGameCreditsInform = null;

   /* Event: invoked when the RevokeCredentials inform is received from the server */
   this.revokeCredentialsInform = null;

   /* Event: invoked when the CreateSession inform is received from the server */
   this.createSessionInform = null;

   /* Event: invoked when the GetInterrupts inform is received from the server */
   this.getInterruptsInform = null;

   /* Event: invoked when the HubEvent inform is received from the server */
   this.hubEventInform = null;

   /* Event: invoked when the GetSoftwareChecksum inform is received from the server */
   this.getSoftwareChecksumInform = null;

   /* Event: invoked when the GetCreditIn inform is received from the server */
   this.getCreditInInform = null;

   /* Event: invoked when the StageUpdate inform is received from the server */
   this.stageUpdateInform = null;

   /* Event: invoked when the GetChangeOut inform is received from the server */
   this.getChangeOutInform = null;

   /* Event: invoked when the SupplyCredentials inform is received from the server */
   this.supplyCredentialsInform = null;

   /* Event: invoked when the CreateScript inform is received from the server */
   this.createScriptInform = null;

   /* Event: invoked when the HubPublish inform is received from the server */
   this.hubPublishInform = null;

   /* Event: invoked when the ComputeMachineStatistics inform is received from the server */
   this.computeMachineStatisticsInform = null;

   /* Event: invoked when the GetGameSerialNumber inform is received from the server */
   this.getGameSerialNumberInform = null;

   /* Event: invoked when the RecoverRunningGame inform is received from the server */
   this.recoverRunningGameInform = null;

   /* Event: invoked when the ComputeGameStatistics inform is received from the server */
   this.computeGameStatisticsInform = null;

   /* Event: invoked when the RemoveCredit inform is received from the server */
   this.removeCreditInform = null;

   /* Event: invoked when the CloseSession inform is received from the server */
   this.closeSessionInform = null;

   /* Event: invoked when the GetWins inform is received from the server */
   this.getWinsInform = null;

   /* Event: invoked when the RecoverFromConnectionLost inform is received from the server */
   this.recoverFromConnectionLostInform = null;

   /* Event: invoked when the GetBets inform is received from the server */
   this.getBetsInform = null;

   /* Event: invoked when the CollectCredit inform is received from the server */
   this.collectCreditInform = null;


   /* Allows the remote client to unsubscribe from a hub. */
   this.hubUnsubscribe = function(hubName, subscribeKey   )
   {
      var requestPacket = new HubUnsubscribeRequest();
      requestPacket.hubName = hubName;
requestPacket.subscribeKey = subscribeKey;
      this._requestedHubUnsubscribeInform ++;
      this.send("06C63B75", requestPacket);
   };

   /*  */
   this.stageResponse = function(stageInstance, elementName   )
   {
      var requestPacket = new StageResponseRequest();
      requestPacket.stageInstance = stageInstance;
requestPacket.elementName = elementName;
      this.send("09CD4876", requestPacket);
   };

   /*  */
   this.getCreditOut = function()
   {
      this._requestedGetCreditOutInform ++;
      this.send("0AFBBBC8", null);
   };


   /*  */
   this.getMetrologyApprobationNumber = function()
   {
      this._requestedGetMetrologyApprobationNumberInform ++;
      this.send("0ED3C2EB", null);
   };


   /*  */
   this.getChangeIn = function()
   {
      this._requestedGetChangeInInform ++;
      this.send("103381EB", null);
   };


   /*  */
   this.setClientType = function(clientType   )
   {
      var requestPacket = new SetClientTypeRequest();
      requestPacket.clientType = clientType;
      this._requestedSetClientTypeInform ++;
      this.send("13CACE4B", requestPacket);
   };

   /* Gets the user interface canvas for current game state */
   this.getStage = function(oldStageInstance, newStageInstance, parameter, preloadOnly   )
   {
      var requestPacket = new GetStageRequest();
      requestPacket.oldStageInstance = oldStageInstance;
requestPacket.newStageInstance = newStageInstance;
requestPacket.parameter = parameter;
requestPacket.preloadOnly = preloadOnly;
      this._requestedGetStageInform ++;
      this.send("145E723E", requestPacket);
   };

   /*  */
   this.getCurrentCredits = function()
   {
      this._requestedGetCurrentCreditsInform ++;
      this.send("15487F1A", null);
   };


   /*  */
   this.addCredit = function(id, amount   )
   {
      var requestPacket = new AddCreditRequest();
      requestPacket.id = id;
requestPacket.amount = amount;
      this._requestedAddCreditInform ++;
      this.send("198D5019", requestPacket);
   };

   /* Pings the server */
   this.ping = function()
   {
      this._requestedPingInform ++;
      this.send("26792C94", null);
   };


   /* Allows the remote client to subscribe to a hub. */
   this.hubSubscribe = function(hubName, subscribeKey   )
   {
      var requestPacket = new HubSubscribeRequest();
      requestPacket.hubName = hubName;
requestPacket.subscribeKey = subscribeKey;
      this._requestedHubSubscribeInform ++;
      this.send("2DD19B9B", requestPacket);
   };

   /*  */
   this.keepAlive = function()
   {
      this._requestedKeepAliveInform ++;
      this.send("33DD402A", null);
   };


   /* Gets the time on the server */
   this.getServerTime = function()
   {
      this._requestedGetServerTimeInform ++;
      this.send("33E7FBD1", null);
   };


   /*  */
   this.getGameSoftwareVersion = function()
   {
      this._requestedGetGameSoftwareVersionInform ++;
      this.send("349C9B48", null);
   };


   /*  */
   this.getUserAgentOptions = function(userAgent   )
   {
      var requestPacket = new GetUserAgentOptionsRequest();
      requestPacket.userAgent = userAgent;
      this._requestedGetUserAgentOptionsInform ++;
      this.send("37D78880", requestPacket);
   };

   /*  */
   this.attachController = function(token   )
   {
      var requestPacket = new AttachControllerRequest();
      requestPacket.token = token;
      this._requestedAttachControllerInform ++;
      this.send("3B0C7065", requestPacket);
   };

   /*  */
   this.getGames = function()
   {
      this._requestedGetGamesInform ++;
      this.send("43FE88F2", null);
   };


   /*  */
   this.updateGameCredits = function()
   {
      this._requestedUpdateGameCreditsInform ++;
      this.send("48DAAD27", null);
   };


   /* Revokes the credentials from the requesting channel. */
   this.revokeCredentials = function(credentialsUri, credentialsType   )
   {
      var requestPacket = new RevokeCredentialsRequest();
      requestPacket.credentialsUri = credentialsUri;
requestPacket.credentialsType = credentialsType;
      this._requestedRevokeCredentialsInform ++;
      this.send("4AC51818", requestPacket);
   };

   /*  */
   this.createSession = function(gameName   )
   {
      var requestPacket = new CreateSessionRequest();
      requestPacket.gameName = gameName;
      this._requestedCreateSessionInform ++;
      this.send("4D1490E0", requestPacket);
   };

   /*  */
   this.synchronizeRTC = function(time   )
   {
      var requestPacket = new SynchronizeRTCRequest();
      requestPacket.time = time;
      this.send("5A387C74", requestPacket);
   };

   /*  */
   this.getInterrupts = function()
   {
      this._requestedGetInterruptsInform ++;
      this.send("5C59F463", null);
   };


   /*  */
   this.getSoftwareChecksum = function(key   )
   {
      var requestPacket = new GetSoftwareChecksumRequest();
      requestPacket.key = key;
      this._requestedGetSoftwareChecksumInform ++;
      this.send("694B6559", requestPacket);
   };

   /*  */
   this.getCreditIn = function()
   {
      this._requestedGetCreditInInform ++;
      this.send("82E2177E", null);
   };


   /*  */
   this.getChangeOut = function()
   {
      this._requestedGetChangeOutInform ++;
      this.send("8A6F61B5", null);
   };


   /* Supplies the requesting channel with the specified client credentials. */
   this.supplyCredentials = function(credentialsUri, credentialsType, userName, password, domain   )
   {
      var requestPacket = new SupplyCredentialsRequest();
      requestPacket.credentialsUri = credentialsUri;
requestPacket.credentialsType = credentialsType;
requestPacket.userName = userName;
requestPacket.password = password;
requestPacket.domain = domain;
      this._requestedSupplyCredentialsInform ++;
      this.send("8D98E9FC", requestPacket);
   };

   /* Publishes an event message to a particular hub. */
   this.hubPublish = function(hubName, publishKey, message   )
   {
      var requestPacket = new HubPublishRequest();
      requestPacket.hubName = hubName;
requestPacket.publishKey = publishKey;
requestPacket.message = message;
      this._requestedHubPublishInform ++;
      this.send("96B41079", requestPacket);
   };

   /*  */
   this.computeMachineStatistics = function(periodStart   )
   {
      var requestPacket = new ComputeMachineStatisticsRequest();
      requestPacket.periodStart = periodStart;
      this._requestedComputeMachineStatisticsInform ++;
      this.send("9A174CCE", requestPacket);
   };

   /*  */
   this.getGameSerialNumber = function()
   {
      this._requestedGetGameSerialNumberInform ++;
      this.send("9B354383", null);
   };


   /*  */
   this.recoverRunningGame = function()
   {
      this._requestedRecoverRunningGameInform ++;
      this.send("BC0E510A", null);
   };


   /*  */
   this.computeGameStatistics = function(periodStart, gameName   )
   {
      var requestPacket = new ComputeGameStatisticsRequest();
      requestPacket.periodStart = periodStart;
requestPacket.gameName = gameName;
      this._requestedComputeGameStatisticsInform ++;
      this.send("C0B104FE", requestPacket);
   };

   /*  */
   this.removeCredit = function(id, amount   )
   {
      var requestPacket = new RemoveCreditRequest();
      requestPacket.id = id;
requestPacket.amount = amount;
      this._requestedRemoveCreditInform ++;
      this.send("C4FF5EB4", requestPacket);
   };

   /*  */
   this.closeSession = function()
   {
      this._requestedCloseSessionInform ++;
      this.send("E0E1FC5B", null);
   };


   /*  */
   this.getWins = function()
   {
      this._requestedGetWinsInform ++;
      this.send("E10CF174", null);
   };


   /*  */
   this.recoverFromConnectionLost = function(gameConnectionID, deviceID   )
   {
      var requestPacket = new RecoverFromConnectionLostRequest();
      requestPacket.gameConnectionID = gameConnectionID;
requestPacket.deviceID = deviceID;
      this._requestedRecoverFromConnectionLostInform ++;
      this.send("E16A8053", requestPacket);
   };

   /*  */
   this.getBets = function()
   {
      this._requestedGetBetsInform ++;
      this.send("EE5D1EFC", null);
   };


   /*  */
   this.collectCredit = function(id   )
   {
      var requestPacket = new CollectCreditRequest();
      requestPacket.id = id;
      this._requestedCollectCreditInform ++;
      this.send("F99FE68C", requestPacket);
   };
   /* Defines if the Inform event will be dispatched only if a request was previously issued (only for pull operations) */
   this.dispatchInformOnlyOnRequest = true;

   this._requestedHubUnsubscribeInform = 0;
   this._requestedGetCreditOutInform = 0;
   this._requestedGetMetrologyApprobationNumberInform = 0;
   this._requestedGetChangeInInform = 0;
   this._requestedSetClientTypeInform = 0;
   this._requestedGetStageInform = 0;
   this._requestedGetCurrentCreditsInform = 0;
   this._requestedAddCreditInform = 0;
   this._requestedPingInform = 0;
   this._requestedHubSubscribeInform = 0;
   this._requestedKeepAliveInform = 0;
   this._requestedGetServerTimeInform = 0;
   this._requestedGetGameSoftwareVersionInform = 0;
   this._requestedGetUserAgentOptionsInform = 0;
   this._requestedAttachControllerInform = 0;
   this._requestedGetGamesInform = 0;
   this._requestedUpdateGameCreditsInform = 0;
   this._requestedRevokeCredentialsInform = 0;
   this._requestedCreateSessionInform = 0;
   this._requestedGetInterruptsInform = 0;
   this._requestedGetSoftwareChecksumInform = 0;
   this._requestedGetCreditInInform = 0;
   this._requestedGetChangeOutInform = 0;
   this._requestedSupplyCredentialsInform = 0;
   this._requestedHubPublishInform = 0;
   this._requestedComputeMachineStatisticsInform = 0;
   this._requestedGetGameSerialNumberInform = 0;
   this._requestedRecoverRunningGameInform = 0;
   this._requestedComputeGameStatisticsInform = 0;
   this._requestedRemoveCreditInform = 0;
   this._requestedCloseSessionInform = 0;
   this._requestedGetWinsInform = 0;
   this._requestedRecoverFromConnectionLostInform = 0;
   this._requestedGetBetsInform = 0;
   this._requestedCollectCreditInform = 0;


   /* This method is automatically generated and allows event dispatching when a packet received */
   this.onReceive = function(operation, reader)
   {
      var packet = this.operationReader.read(operation, reader);
      switch (operation)
      {
         case "06C63B75":
         if((this.dispatchInformOnlyOnRequest && this._requestedHubUnsubscribeInform > 0) || !this.dispatchInformOnlyOnRequest)
         {
            this._requestedHubUnsubscribeInform --;
            if(this.hubUnsubscribeInform != null)
            {
               this.hubUnsubscribeInform(packet);
            }
         }
         return;
         case "0AFBBBC8":
         if((this.dispatchInformOnlyOnRequest && this._requestedGetCreditOutInform > 0) || !this.dispatchInformOnlyOnRequest)
         {
            this._requestedGetCreditOutInform --;
            if(this.getCreditOutInform != null)
            {
               this.getCreditOutInform(packet);
            }
         }
         return;
         case "0ED3C2EB":
         if((this.dispatchInformOnlyOnRequest && this._requestedGetMetrologyApprobationNumberInform > 0) || !this.dispatchInformOnlyOnRequest)
         {
            this._requestedGetMetrologyApprobationNumberInform --;
            if(this.getMetrologyApprobationNumberInform != null)
            {
               this.getMetrologyApprobationNumberInform(packet);
            }
         }
         return;
         case "103381EB":
         if((this.dispatchInformOnlyOnRequest && this._requestedGetChangeInInform > 0) || !this.dispatchInformOnlyOnRequest)
         {
            this._requestedGetChangeInInform --;
            if(this.getChangeInInform != null)
            {
               this.getChangeInInform(packet);
            }
         }
         return;
         case "13CACE4B":
         if((this.dispatchInformOnlyOnRequest && this._requestedSetClientTypeInform > 0) || !this.dispatchInformOnlyOnRequest)
         {
            this._requestedSetClientTypeInform --;
            if(this.setClientTypeInform != null)
            {
               this.setClientTypeInform(packet);
            }
         }
         return;
         case "145E723E":
         if((this.dispatchInformOnlyOnRequest && this._requestedGetStageInform > 0) || !this.dispatchInformOnlyOnRequest)
         {
            this._requestedGetStageInform --;
            if(this.getStageInform != null)
            {
               this.getStageInform(packet);
            }
         }
         return;
         case "15487F1A":
         if((this.dispatchInformOnlyOnRequest && this._requestedGetCurrentCreditsInform > 0) || !this.dispatchInformOnlyOnRequest)
         {
            this._requestedGetCurrentCreditsInform --;
            if(this.getCurrentCreditsInform != null)
            {
               this.getCurrentCreditsInform(packet);
            }
         }
         return;
         case "198D5019":
         if((this.dispatchInformOnlyOnRequest && this._requestedAddCreditInform > 0) || !this.dispatchInformOnlyOnRequest)
         {
            this._requestedAddCreditInform --;
            if(this.addCreditInform != null)
            {
               this.addCreditInform(packet);
            }
         }
         return;
         case "26792C94":
         if((this.dispatchInformOnlyOnRequest && this._requestedPingInform > 0) || !this.dispatchInformOnlyOnRequest)
         {
            this._requestedPingInform --;
            if(this.pingInform != null)
            {
               this.pingInform(packet);
            }
         }
         return;
         case "2DD19B9B":
         if((this.dispatchInformOnlyOnRequest && this._requestedHubSubscribeInform > 0) || !this.dispatchInformOnlyOnRequest)
         {
            this._requestedHubSubscribeInform --;
            if(this.hubSubscribeInform != null)
            {
               this.hubSubscribeInform(packet);
            }
         }
         return;
         case "33DD402A":
         if((this.dispatchInformOnlyOnRequest && this._requestedKeepAliveInform > 0) || !this.dispatchInformOnlyOnRequest)
         {
            this._requestedKeepAliveInform --;
            if(this.keepAliveInform != null)
            {
               this.keepAliveInform(packet);
            }
         }
         return;
         case "33E7FBD1":
         if((this.dispatchInformOnlyOnRequest && this._requestedGetServerTimeInform > 0) || !this.dispatchInformOnlyOnRequest)
         {
            this._requestedGetServerTimeInform --;
            if(this.getServerTimeInform != null)
            {
               this.getServerTimeInform(packet);
            }
         }
         return;
         case "349C9B48":
         if((this.dispatchInformOnlyOnRequest && this._requestedGetGameSoftwareVersionInform > 0) || !this.dispatchInformOnlyOnRequest)
         {
            this._requestedGetGameSoftwareVersionInform --;
            if(this.getGameSoftwareVersionInform != null)
            {
               this.getGameSoftwareVersionInform(packet);
            }
         }
         return;
         case "37D78880":
         if((this.dispatchInformOnlyOnRequest && this._requestedGetUserAgentOptionsInform > 0) || !this.dispatchInformOnlyOnRequest)
         {
            this._requestedGetUserAgentOptionsInform --;
            if(this.getUserAgentOptionsInform != null)
            {
               this.getUserAgentOptionsInform(packet);
            }
         }
         return;
         case "3B0C7065":
         if((this.dispatchInformOnlyOnRequest && this._requestedAttachControllerInform > 0) || !this.dispatchInformOnlyOnRequest)
         {
            this._requestedAttachControllerInform --;
            if(this.attachControllerInform != null)
            {
               this.attachControllerInform(packet);
            }
         }
         return;
         case "43FE88F2":
         if((this.dispatchInformOnlyOnRequest && this._requestedGetGamesInform > 0) || !this.dispatchInformOnlyOnRequest)
         {
            this._requestedGetGamesInform --;
            if(this.getGamesInform != null)
            {
               this.getGamesInform(packet);
            }
         }
         return;
         case "48DAAD27":
         if((this.dispatchInformOnlyOnRequest && this._requestedUpdateGameCreditsInform > 0) || !this.dispatchInformOnlyOnRequest)
         {
            this._requestedUpdateGameCreditsInform --;
            if(this.updateGameCreditsInform != null)
            {
               this.updateGameCreditsInform(packet);
            }
         }
         return;
         case "4AC51818":
         if((this.dispatchInformOnlyOnRequest && this._requestedRevokeCredentialsInform > 0) || !this.dispatchInformOnlyOnRequest)
         {
            this._requestedRevokeCredentialsInform --;
            if(this.revokeCredentialsInform != null)
            {
               this.revokeCredentialsInform(packet);
            }
         }
         return;
         case "4D1490E0":
         if((this.dispatchInformOnlyOnRequest && this._requestedCreateSessionInform > 0) || !this.dispatchInformOnlyOnRequest)
         {
            this._requestedCreateSessionInform --;
            if(this.createSessionInform != null)
            {
               this.createSessionInform(packet);
            }
         }
         return;
         case "5C59F463":
         if((this.dispatchInformOnlyOnRequest && this._requestedGetInterruptsInform > 0) || !this.dispatchInformOnlyOnRequest)
         {
            this._requestedGetInterruptsInform --;
            if(this.getInterruptsInform != null)
            {
               this.getInterruptsInform(packet);
            }
         }
         return;
         case "65B2818C":
         if(this.hubEventInform != null)
         {
            this.hubEventInform(packet);
         }
         return;
         case "694B6559":
         if((this.dispatchInformOnlyOnRequest && this._requestedGetSoftwareChecksumInform > 0) || !this.dispatchInformOnlyOnRequest)
         {
            this._requestedGetSoftwareChecksumInform --;
            if(this.getSoftwareChecksumInform != null)
            {
               this.getSoftwareChecksumInform(packet);
            }
         }
         return;
         case "82E2177E":
         if((this.dispatchInformOnlyOnRequest && this._requestedGetCreditInInform > 0) || !this.dispatchInformOnlyOnRequest)
         {
            this._requestedGetCreditInInform --;
            if(this.getCreditInInform != null)
            {
               this.getCreditInInform(packet);
            }
         }
         return;
         case "882E6204":
         if(this.stageUpdateInform != null)
         {
            this.stageUpdateInform(packet);
         }
         return;
         case "8A6F61B5":
         if((this.dispatchInformOnlyOnRequest && this._requestedGetChangeOutInform > 0) || !this.dispatchInformOnlyOnRequest)
         {
            this._requestedGetChangeOutInform --;
            if(this.getChangeOutInform != null)
            {
               this.getChangeOutInform(packet);
            }
         }
         return;
         case "8D98E9FC":
         if((this.dispatchInformOnlyOnRequest && this._requestedSupplyCredentialsInform > 0) || !this.dispatchInformOnlyOnRequest)
         {
            this._requestedSupplyCredentialsInform --;
            if(this.supplyCredentialsInform != null)
            {
               this.supplyCredentialsInform(packet);
            }
         }
         return;
         case "924F7330":
         if(this.createScriptInform != null)
         {
            this.createScriptInform(packet);
         }
         return;
         case "96B41079":
         if((this.dispatchInformOnlyOnRequest && this._requestedHubPublishInform > 0) || !this.dispatchInformOnlyOnRequest)
         {
            this._requestedHubPublishInform --;
            if(this.hubPublishInform != null)
            {
               this.hubPublishInform(packet);
            }
         }
         return;
         case "9A174CCE":
         if((this.dispatchInformOnlyOnRequest && this._requestedComputeMachineStatisticsInform > 0) || !this.dispatchInformOnlyOnRequest)
         {
            this._requestedComputeMachineStatisticsInform --;
            if(this.computeMachineStatisticsInform != null)
            {
               this.computeMachineStatisticsInform(packet);
            }
         }
         return;
         case "9B354383":
         if((this.dispatchInformOnlyOnRequest && this._requestedGetGameSerialNumberInform > 0) || !this.dispatchInformOnlyOnRequest)
         {
            this._requestedGetGameSerialNumberInform --;
            if(this.getGameSerialNumberInform != null)
            {
               this.getGameSerialNumberInform(packet);
            }
         }
         return;
         case "BC0E510A":
         if((this.dispatchInformOnlyOnRequest && this._requestedRecoverRunningGameInform > 0) || !this.dispatchInformOnlyOnRequest)
         {
            this._requestedRecoverRunningGameInform --;
            if(this.recoverRunningGameInform != null)
            {
               this.recoverRunningGameInform(packet);
            }
         }
         return;
         case "C0B104FE":
         if((this.dispatchInformOnlyOnRequest && this._requestedComputeGameStatisticsInform > 0) || !this.dispatchInformOnlyOnRequest)
         {
            this._requestedComputeGameStatisticsInform --;
            if(this.computeGameStatisticsInform != null)
            {
               this.computeGameStatisticsInform(packet);
            }
         }
         return;
         case "C4FF5EB4":
         if((this.dispatchInformOnlyOnRequest && this._requestedRemoveCreditInform > 0) || !this.dispatchInformOnlyOnRequest)
         {
            this._requestedRemoveCreditInform --;
            if(this.removeCreditInform != null)
            {
               this.removeCreditInform(packet);
            }
         }
         return;
         case "E0E1FC5B":
         if((this.dispatchInformOnlyOnRequest && this._requestedCloseSessionInform > 0) || !this.dispatchInformOnlyOnRequest)
         {
            this._requestedCloseSessionInform --;
            if(this.closeSessionInform != null)
            {
               this.closeSessionInform(packet);
            }
         }
         return;
         case "E10CF174":
         if((this.dispatchInformOnlyOnRequest && this._requestedGetWinsInform > 0) || !this.dispatchInformOnlyOnRequest)
         {
            this._requestedGetWinsInform --;
            if(this.getWinsInform != null)
            {
               this.getWinsInform(packet);
            }
         }
         return;
         case "E16A8053":
         if((this.dispatchInformOnlyOnRequest && this._requestedRecoverFromConnectionLostInform > 0) || !this.dispatchInformOnlyOnRequest)
         {
            this._requestedRecoverFromConnectionLostInform --;
            if(this.recoverFromConnectionLostInform != null)
            {
               this.recoverFromConnectionLostInform(packet);
            }
         }
         return;
         case "EE5D1EFC":
         if((this.dispatchInformOnlyOnRequest && this._requestedGetBetsInform > 0) || !this.dispatchInformOnlyOnRequest)
         {
            this._requestedGetBetsInform --;
            if(this.getBetsInform != null)
            {
               this.getBetsInform(packet);
            }
         }
         return;
         case "F99FE68C":
         if((this.dispatchInformOnlyOnRequest && this._requestedCollectCreditInform > 0) || !this.dispatchInformOnlyOnRequest)
         {
            this._requestedCollectCreditInform --;
            if(this.collectCreditInform != null)
            {
               this.collectCreditInform(packet);
            }
         }
         return;
      }
   }

};

