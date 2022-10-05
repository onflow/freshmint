import * as path from 'path';
import * as fs from 'fs';
import * as Handlebars from 'handlebars';

export function registerHelper(name: string, fn: Handlebars.HelperDelegate) {
  Handlebars.registerHelper(name, fn);
}

export function registerPartial(name: string, source: string) {
  const templateSource = fs.readFileSync(path.resolve(__dirname, source), 'utf8');
  Handlebars.registerPartial(name, templateSource);
}
