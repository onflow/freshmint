pub fun resolveDisplay(): MetadataViews.Display {
    return MetadataViews.Display(
        name: self.{{ view.options.name.name }}(),
        description: self.{{ view.options.description.name }}(),
        thumbnail: {{> (whichFilePartial view.options.thumbnail) field=view.options.thumbnail }}
    )
}
