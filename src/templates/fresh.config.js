module.exports = {
  metadataFormat: {{#if onChainMetadata}}"on-chain"{{else}}"off-chain"{{/if}},
  {{#if onChainMetadata}}
  customFields: [
    {{#each fields}}
    {{#if this.isCustom}}
    {
      name: "{{ this.name }}",
      type: "{{ this.type.label }}"
    },
    {{/if}}
    {{/each}}
  ],
  {{/if}}
  pinningService: {
    endpoint: process.env.PINNING_SERVICE_ENDPOINT,
    key: process.env.PINNING_SERVICE_KEY
  }
}
