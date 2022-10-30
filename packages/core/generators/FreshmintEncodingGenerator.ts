/* eslint-disable @typescript-eslint/no-var-requires */

import TemplateGenerator from './TemplateGenerator';

export class FreshmintEncodingGenerator extends TemplateGenerator {
  static contract(): string {
    return this.generate(require('../../../cadence/freshmint-encoding/FreshmintEncoding.cdc'));
  }
}
