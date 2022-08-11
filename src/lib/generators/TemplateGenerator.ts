import * as path from 'path';
import * as fs from 'fs';
import * as Handlebars from 'handlebars';

export interface Contracts {
  [key: string]: string;
}

export function registerHelper(name: string, fn: Handlebars.HelperDelegate) {
  Handlebars.registerHelper(name, fn);
}

export function registerPartial(name: string, source: string) {
  const templateSource = fs.readFileSync(path.resolve(__dirname, source), 'utf8');
  Handlebars.registerPartial(name, templateSource);
}

export default class TemplateGenerator {
  static async generate(source: string, context: any): Promise<string> {
    const templateSource = await fs.promises.readFile(path.resolve(__dirname, source), 'utf8');

    const template = Handlebars.compile(templateSource);

    return template(context, {
      allowedProtoMethods: {
        asCadenceTypeString: true,
      },
    });
  }
}
