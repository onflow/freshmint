module.exports = {
  schema: [
    {{#each schema.fields}}
    {
      name: "{{ this.name }}",
      type: "{{ this.type.id }}"
    },
    {{/each}}
  ],
  pinningService: {
    endpoint: process.env.PINNING_SERVICE_ENDPOINT,
    key: process.env.PINNING_SERVICE_KEY
  }
}
