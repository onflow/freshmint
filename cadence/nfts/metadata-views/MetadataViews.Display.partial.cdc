pub fun resolveDisplay(_ metadata: {String: AnyStruct}): MetadataViews.Display {
    return MetadataViews.Display(
        name: metadata["{{ view.options.name.name }}"]! as! String,
        description: metadata["{{ view.options.description.name }}"]! as! String,
        thumbnail: {{> (whichFilePartial view.options.thumbnail) metadata="metadata" field=view.options.thumbnail }}
    )
}
