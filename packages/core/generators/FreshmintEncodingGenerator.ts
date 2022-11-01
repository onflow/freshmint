/* eslint-disable @typescript-eslint/no-var-requires */

import { ContractImports } from '../config';
import TemplateGenerator from './TemplateGenerator';

export class FreshmintEncodingGenerator extends TemplateGenerator {
  static contract(): string {
    return this.generate(require('../../../cadence/freshmint-encoding/FreshmintEncoding.cdc'));
  }

  static encode({ imports, type }: { imports: ContractImports; type: string }): string {
    return this.generate(require('../../../cadence/freshmint-encoding/scripts/encode.template.cdc'), {
      imports,
      type,
    });
  }
}
