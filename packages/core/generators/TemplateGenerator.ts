import * as path from 'path';
import * as fs from 'fs';
import * as Handlebars from 'handlebars';
import { version } from '../version';

export default class TemplateGenerator {
  static generate(source: string, context: any): string {
    const templateSource = fs.readFileSync(path.resolve(__dirname, source), 'utf8');

    const template = Handlebars.compile(templateSource);

    // Inject package version into template context
    context.freshmintVersion = version;

    return template(context, {
      allowedProtoMethods: {
        asCadenceTypeString: true,
        getCadenceByteTemplate: true,
      },
    });
  }
}
