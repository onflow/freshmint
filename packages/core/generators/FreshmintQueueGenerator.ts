/* eslint-disable @typescript-eslint/no-var-requires */

import { ContractImports } from '../config';
import TemplateGenerator from './TemplateGenerator';

export class FreshmintQueueGenerator extends TemplateGenerator {
  static contract({ imports }: { imports: ContractImports }): string {
    return this.generate(require('../../../cadence/freshmint-queue/FreshmintQueue.cdc'), {imports});
  }
}
