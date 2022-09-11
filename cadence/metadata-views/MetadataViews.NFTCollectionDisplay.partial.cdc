pub fun resolveNFTCollectionDisplay(_ metadata: Metadata): MetadataViews.NFTCollectionDisplay {
    let media = MetadataViews.Media(
        file: MetadataViews.IPFSFile(
            cid: "{{ view.options.media.ipfsCid }}", 
            path: nil
        ),
        mediaType: "{{ view.options.media.type }}"
    )

    return MetadataViews.NFTCollectionDisplay(
        name: "{{ view.options.name }}",
        description: "{{ view.options.description }}",
        externalURL: MetadataViews.ExternalURL("{{ view.options.url }}"),
        squareImage: media,
        bannerImage: media,
        socials: {}
    )
}
