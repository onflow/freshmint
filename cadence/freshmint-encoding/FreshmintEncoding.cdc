/// FreshmintEncoding includes a set of utilities for encoding Cadence values as byte arrays.
///
/// Variable-legnth values (String, Int, UInt) include a fixed-size length prefix to
/// prevent distinct sets of values from encoding to the same byte sequence
/// when multiple values are concatenated.
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

    pub fun encodeInt(_ value: Int): [UInt8] {
        let bytes = value.toBigEndianBytes()
        let length = UInt16(bytes.length)

        // Prefix byte encoding with a fixed-size encoding of its length
        return length.toBigEndianBytes().concat(bytes)
    }

    pub fun encodeUInt(_ value: UInt): [UInt8] {
        let bytes = value.toBigEndianBytes()
        let length = UInt16(bytes.length)

        // Prefix byte encoding with a fixed-size encoding of its length
        return length.toBigEndianBytes().concat(bytes)
    }

    pub fun encodeUInt8(_ value: UInt8): [UInt8] {
        return value.toBigEndianBytes()
    }

    pub fun encodeUInt16(_ value: UInt16): [UInt8] {
        return value.toBigEndianBytes()
    }

    pub fun encodeUInt32(_ value: UInt32): [UInt8] {
        return value.toBigEndianBytes()
    }

    pub fun encodeUInt64(_ value: UInt64): [UInt8] {
        return value.toBigEndianBytes()
    }

    pub fun encodeUInt128(_ value: UInt128): [UInt8] {
        return value.toBigEndianBytes()
    }

    pub fun encodeUInt256(_ value: UInt256): [UInt8] {
        return value.toBigEndianBytes()
    }

    pub fun encodeInt8(_ value: Int8): [UInt8] {
        return value.toBigEndianBytes()
    }

    pub fun encodeInt16(_ value: Int16): [UInt8] {
        return value.toBigEndianBytes()
    }

    pub fun encodeInt32(_ value: Int32): [UInt8] {
        return value.toBigEndianBytes()
    }

    pub fun encodeInt64(_ value: Int64): [UInt8] {
        return value.toBigEndianBytes()
    }

    pub fun encodeInt128(_ value: Int128): [UInt8] {
        return value.toBigEndianBytes()
    }

    pub fun encodeInt256(_ value: Int256): [UInt8] {
        return value.toBigEndianBytes()
    }

    pub fun encodeUFix64(_ value: UFix64): [UInt8] {
        return value.toBigEndianBytes()
    }

    pub fun encodeFix64(_ value: Fix64): [UInt8] {
        return value.toBigEndianBytes()
    }

    pub fun encodeString(_ value: String): [UInt8] {
        let bytes = value.utf8
        let length = UInt16(bytes.length)

        // Prefix byte encoding with a fixed-size encoding of its length
        return length.toBigEndianBytes().concat(value.utf8)
    }

    pub fun encodeAddress(_ value: Address): [UInt8] {
        return value.toBytes()
    }
}
