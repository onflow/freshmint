import * as Handlebars from 'handlebars';
import { version } from '../version';

export default class TemplateGenerator {
  static generate(source: string, context: any = {}): string {
    const template = Handlebars.compile(source);

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
