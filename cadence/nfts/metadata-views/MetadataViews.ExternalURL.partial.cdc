pub fun resolveExternalURL(): MetadataViews.ExternalURL {
    {{#if view.options.includesCollectionUrl }}
    let collectionURL = {{ contractName }}.collectionMetadata!.externalURL.url
    {{/if}}
    {{#if view.options.includesNftOwner }}
    let nftOwner = self.owner!.address.toString()
    {{/if}}
    {{#if view.options.includesNftId }}
    let nftID = self.id.toString()
    {{/if}}
    return MetadataViews.ExternalURL({{{ view.options.cadenceTemplate }}})
}
