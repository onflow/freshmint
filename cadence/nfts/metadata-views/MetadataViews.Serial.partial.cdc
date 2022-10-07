pub fun resolveSerial(_ metadata: Metadata): MetadataViews.Serial {
    return MetadataViews.Serial(metadata.{{ view.options.serialNumber.name }})
}
