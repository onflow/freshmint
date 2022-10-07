pub fun resolveDisplay(_ metadata: Metadata): MetadataViews.Display {
    return MetadataViews.Display(
        name: metadata.{{ view.options.name.name }},
        description: metadata.{{ view.options.description.name }},
        thumbnail: {{> (whichFilePartial view.options.thumbnail) metadata="metadata" field=view.options.thumbnail }}
    )
}
