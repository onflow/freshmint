import * as Handlebars from 'handlebars';

export function registerHelper(name: string, fn: Handlebars.HelperDelegate) {
  Handlebars.registerHelper(name, fn);
}

export function registerPartial(name: string, source: string) {
  Handlebars.registerPartial(name, source);
}
