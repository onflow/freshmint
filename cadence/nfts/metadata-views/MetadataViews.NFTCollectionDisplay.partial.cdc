pub fun resolveNFTCollectionDisplay(): MetadataViews.NFTCollectionDisplay {
    {{#if view.options }}
    let media = MetadataViews.Media(
        {{#if view.options.media.ipfs }}
        file: MetadataViews.IPFSFile(
            cid: "{{ view.options.media.ipfs.cid }}", 
            path: {{#if view.options.media.ipfs.path }}"{{ view.options.media.ipfs.path }}"{{ else }}nil{{/if}}
        ),
        {{ else }}
        file: MetadataViews.HTTPFile(url: "{{ view.options.media.url }}"),
        {{/if}}
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
    {{ else }}
    return {{ contractName }}.collectionMetadata
    {{/if}}
}
