module.exports = {
  metadataFormat: {{#if onChainMetadata}}"on-chain"{{else}}"off-chain"{{/if}},
  {{#if onChainMetadata}}
  metadataFields: [
    {{#each fields}}
    {
      name: "{{ this.name }}",
      type: "{{ this.type.label }}"
    },
    {{/each}}
  ],
  {{/if}}
  pinningService: {
    endpoint: process.env.PINNING_SERVICE_ENDPOINT,
    key: process.env.PINNING_SERVICE_KEY
  }
}
