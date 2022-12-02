import {{ contractName }} from {{{ contractAddress }}}

/// This transaction fetches an edition by ID.
///
/// Parameters:
/// - id: the ID of the edition to fetch.
///
/// Returns: a {{ contractName }}.Edition struct containing the edition details.
///
pub fun main(id: UInt64): {{ contractName }}.Edition? {
    return {{ contractName }}.getEdition(id: id)
}
