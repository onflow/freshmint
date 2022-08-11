return MetadataViews.Display(
    name: {{ metadata }}.{{viewField view.options.name }},
    description: {{ metadata }}.{{viewField view.options.description }},
    thumbnail: MetadataViews.IPFSFile(
        cid: {{ metadata }}.{{viewField view.options.thumbnail }}, 
        path: nil
    )
)
