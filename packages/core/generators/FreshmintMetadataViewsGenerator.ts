/* eslint-disable @typescript-eslint/no-var-requires */

import TemplateGenerator from './TemplateGenerator';

export class FreshmintMetadataViewsGenerator extends TemplateGenerator {
  static contract(): string {
    return this.generate(require('../../../cadence/freshmint-metadata-views/FreshmintMetadataViews.cdc'));
  }
}
