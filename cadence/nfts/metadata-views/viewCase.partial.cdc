case {{{ view.cadenceTypeString }}}:
    {{#if view.cadenceResolverFunction }}
    {{#if view.requiresMetadata }}
    return self.{{ view.cadenceResolverFunction }}({{ metadata }})
    {{ else }}
    return self.{{ view.cadenceResolverFunction }}()
    {{/if}}
    {{ else }}
    {{#with view}}
    {{> (lookup . "id") view=view metadata=metadata }}
    {{/with}}
    {{/if}}
