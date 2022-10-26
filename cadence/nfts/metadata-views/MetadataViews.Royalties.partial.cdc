pub fun resolveRoyalties(): MetadataViews.Royalties {
    {{#if view.options}}
    return MetadataViews.Royalties([
        {{#each view.options}}
        MetadataViews.Royalty(
            receiver: getAccount({{ this.address }}).getCapability<&{FungibleToken.Receiver}>({{ this.receiverPath }}),
            cut: {{ this.cut }},
            description: {{#if this.description }}"{{{ this.description }}}"{{ else }}""{{/if}}
        ){{#unless @last }},{{/unless}}
        {{/each}}
    ])
    {{ else }}
    return MetadataViews.Royalties([])
    {{/if}}
}
