return MetadataViews.Media(
    file: {{> (whichFilePartial view.options.file) metadata=metadata field=view.options.file }},
    mediaType: "{{ view.options.mediaType }}"
)
