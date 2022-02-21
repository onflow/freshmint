module.exports = {
  {{#if customFields}}
  customFields: [
    {{#each customFields}}
    {
      name: "{{ this.name }}",
      type: "{{ this.type.label }}"
    },
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
