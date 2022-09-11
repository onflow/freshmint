return MetadataViews.Media(
    file: {{> (whichFilePartial view.options.file) field=view.options.file }},
    mediaType: "{{ view.options.mediaType }}"
)
