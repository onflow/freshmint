pub fun resolveExternalURL(_ metadata: Metadata): MetadataViews.ExternalURL {
    return MetadataViews.ExternalURL({{{ view.options.cadenceTemplate }}})
}
