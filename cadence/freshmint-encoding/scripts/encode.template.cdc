import FreshmintEncoding from {{ imports.FreshmintEncoding }}

pub fun main(value: {{ type }}): String {
  return String.encodeHex(FreshmintEncoding.encode{{ type}}(value))
}
