pub fun resolveSerial(): MetadataViews.Serial {
    return MetadataViews.Serial({{ metadataInstance }}.{{ view.options.serialNumber.name }}())
}
