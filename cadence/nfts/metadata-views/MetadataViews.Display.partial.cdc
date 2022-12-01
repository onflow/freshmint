pub fun resolveDisplay(): MetadataViews.Display {
    return MetadataViews.Display(
        name: {{ metadataInstance }}.{{ view.options.name.name }}(),
        description: {{ metadataInstance }}.{{ view.options.description.name }}(),
        thumbnail: {{> (whichFilePartial view.options.thumbnail) field=view.options.thumbnail metadataInstance=metadataInstance }}
    )
}
