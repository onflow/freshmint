return MetadataViews.Media(
    file: {{> (whichFilePartial view.options.file) field=view.options.file metadataInstance=metadataInstance }},
    mediaType: "{{ view.options.mediaType }}"
)
