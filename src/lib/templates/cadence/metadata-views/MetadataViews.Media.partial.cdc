return MetadataViews.Media(
    file: MetadataViews.IPFSFile(
        cid: {{ metadata }}.{{viewField view.options.file }}, 
        path: nil
    ),
    mediaType: "{{ view.options.mediaType }}"
)
