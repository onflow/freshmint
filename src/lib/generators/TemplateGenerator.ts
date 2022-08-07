import * as Handlebars from 'handlebars';

import * as path from 'path';
import * as fs from 'fs';
import { Field } from '../metadata';

export interface Contracts {
  [key: string]: string;
}

Handlebars.registerHelper('viewField', function (value) {
  if (value instanceof Field) {
    return value.name;
  }

  return value;
});

export default class TemplateGenerator {
  static async generate(src: string, context: any): Promise<string> {
    const templateSource = await fs.promises.readFile(path.resolve(__dirname, src), 'utf8');

    const template = Handlebars.compile(templateSource);

    return template(context, {
      allowedProtoMethods: {
        asCadenceTypeString: true,
      },
    });
  }
}
