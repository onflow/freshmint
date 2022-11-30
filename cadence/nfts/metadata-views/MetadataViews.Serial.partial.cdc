pub fun resolveSerial(): MetadataViews.Serial {
    return MetadataViews.Serial(self.{{ view.options.serialNumber.name }}())
}
