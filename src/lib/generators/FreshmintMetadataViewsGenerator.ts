import TemplateGenerator from './TemplateGenerator';

export class FreshmintMetadataViewsGenerator extends TemplateGenerator {
  static contract(): string {
    return this.generate('../../../cadence/metadata-views/FreshmintMetadataViews.cdc', {});
  }
}
