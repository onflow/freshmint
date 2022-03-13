module.exports = {
  {{#if fields}}
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
  {{else}}
  customFields: [],
  {{/if}}
  pinningService: {
    endpoint: process.env.PINNING_SERVICE_ENDPOINT,
    key: process.env.PINNING_SERVICE_KEY
  },
}
