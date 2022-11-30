case {{{ view.cadenceTypeString }}}:
    {{#if view.cadenceResolverFunction }}
    return self.{{ view.cadenceResolverFunction }}()
    {{ else }}
    {{#with view}}
    {{> (lookup . "id") view=view }}
    {{/with}}
    {{/if}}
