/// FreshmintEncoding is a set of utilities for encoding Cadence values as byte arrays.
///
/// Variable-length values (String, Int, UInt) include a fixed-size length prefix to
/// prevent distinct sets of values from encoding to the same byte sequence when concatenated.
///
/// For example, for a structure with two fields:
///
///  - foo: String
///  - bar: String
///
/// Without a length prefix, these instances would produce the same encoding:
///
///  - Instance A: { foo: "foo", bar: "bar" }
///  - Instance b: { foo: "foob", bar: "ar" }
///
/// when using an encoding function like this:
/// 
/// let encoding = encodeString(foo).concat(encodeString(bar))
///
pub contract FreshmintEncoding {

    /// encodeUInt encodes a UInt value.
    ///
    /// A UInt value is encoded as a variable-length array containing
    /// its big endian byte representation, prefixed by its length.
    ///
    pub fun encodeUInt(_ value: UInt): [UInt8] {
        let bytes = value.toBigEndianBytes()
        let length = UInt16(bytes.length)

        // Prefix byte encoding with a fixed-size encoding of its length
        return length.toBigEndianBytes().concat(bytes)
    }

    /// encodeUInt8 encodes a UInt8 value.
    ///
    /// A UInt8 value is encoded as a single byte.
    ///
    pub fun encodeUInt8(_ value: UInt8): [UInt8] {
        return value.toBigEndianBytes()
    }

    /// encodeUInt16 encodes a UInt16 value.
    ///
    /// A UInt16 value is encoded as a big-endian
    /// byte array with a fixed length of 2 bytes.
    ///
    pub fun encodeUInt16(_ value: UInt16): [UInt8] {
        return value.toBigEndianBytes()
    }

    /// encodeUInt32 encodes a UInt32 value.
    ///
    /// A UInt32 value is encoded as a big-endian
    /// byte array with a fixed length of 4 bytes.
    ///
    pub fun encodeUInt32(_ value: UInt32): [UInt8] {
        return value.toBigEndianBytes()
    }

    /// encodeUInt64 encodes a UInt64 value.
    ///
    /// A UInt64 value is encoded as a big-endian
    /// byte array with a fixed length of 8 bytes.
    ///
    pub fun encodeUInt64(_ value: UInt64): [UInt8] {
        return value.toBigEndianBytes()
    }

    /// encodeUInt128 encodes a UInt128 value.
    ///
    /// A UInt128 value is encoded as a big-endian
    /// byte array with a fixed length of 16 bytes.
    ///
    pub fun encodeUInt128(_ value: UInt128): [UInt8] {
        return value.toBigEndianBytes()
    }

    /// encodeUInt256 encodes a UInt256 value.
    ///
    /// A UInt256 value is encoded as a big-endian
    /// byte array with a fixed length of 32 bytes.
    ///
    pub fun encodeUInt256(_ value: UInt256): [UInt8] {
        return value.toBigEndianBytes()
    }

    /// encodeInt encodes an Int value.
    ///
    /// An Int value is encoded as a variable-length array containing
    /// its big endian byte representation, prefixed by its length.
    ///
    /// Negative numbers are encoded as their two's complement.
    ///
    pub fun encodeInt(_ value: Int): [UInt8] {
        let bytes = value.toBigEndianBytes()
        let length = UInt16(bytes.length)

        // Prefix byte encoding with a fixed-size encoding of its length
        return length.toBigEndianBytes().concat(bytes)
    }

    /// encodeInt8 encodes a Int8 value.
    ///
    /// An Int8 value is encoded as a single byte
    /// in two's complement form.
    ///
    pub fun encodeInt8(_ value: Int8): [UInt8] {
        return value.toBigEndianBytes()
    }

    /// encodeInt16 encodes an Int16 value.
    ///
    /// An Int16 value is encoded as a big-endian
    /// byte array in two's complement form 
    /// with a fixed length of 2 bytes.
    ///
    pub fun encodeInt16(_ value: Int16): [UInt8] {
        return value.toBigEndianBytes()
    }

    /// encodeInt32 encodes an Int32 value.
    ///
    /// An Int32 value is encoded as a big-endian
    /// byte array in two's complement form 
    /// with a fixed length of 4 bytes.
    ///
    pub fun encodeInt32(_ value: Int32): [UInt8] {
        return value.toBigEndianBytes()
    }

    /// encodeInt64 encodes an Int64 value.
    ///
    /// An Int64 value is encoded as a big-endian
    /// byte array in two's complement form 
    /// with a fixed length of 8 bytes.
    ///
    pub fun encodeInt64(_ value: Int64): [UInt8] {
        return value.toBigEndianBytes()
    }

    /// encodeInt128 encodes an Int128 value.
    ///
    /// An Int128 value is encoded as a big-endian
    /// byte array in two's complement form 
    /// with a fixed length of 16 bytes.
    ///
    pub fun encodeInt128(_ value: Int128): [UInt8] {
        return value.toBigEndianBytes()
    }

    /// encodeInt256 encodes an Int256 value.
    ///
    /// An Int256 value is encoded as a big-endian
    /// byte array in two's complement form 
    /// with a fixed length of 32 bytes.
    ///
    pub fun encodeInt256(_ value: Int256): [UInt8] {
        return value.toBigEndianBytes()
    }

    /// encodeUFix64 encodes a UFix64 value.
    ///
    /// A UFix64 value is encoded as a big-endian
    /// byte array with a fixed length of 8 bytes.
    ///
    pub fun encodeUFix64(_ value: UFix64): [UInt8] {
        return value.toBigEndianBytes()
    }

    /// encodeFix64 encodes a Fix64 value.
    ///
    /// A Fix64 value is encoded as a big-endian
    /// byte array with a fixed length of 8 bytes.
    ///
    pub fun encodeFix64(_ value: Fix64): [UInt8] {
        return value.toBigEndianBytes()
    }

    /// encodeString encodes a String value.
    ///
    /// A String value is encoded as a variable-length array containing
    /// its UTF-8 representation, prefixed by its length.
    ///
    pub fun encodeString(_ value: String): [UInt8] {
        let bytes = value.utf8
        let length = UInt16(bytes.length)

        // Prefix byte encoding with a fixed-size encoding of its length
        return length.toBigEndianBytes().concat(value.utf8)
    }

    /// encodeAddress encodes an Address value.
    ///
    /// An Address value is encoded as an array of 8 bytes.
    ///
    pub fun encodeAddress(_ value: Address): [UInt8] {
        return value.toBytes()
    }
}
