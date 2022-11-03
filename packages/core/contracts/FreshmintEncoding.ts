import { FreshmintEncodingGenerator } from '../generators/FreshmintEncodingGenerator';

import { CadenceType } from '../cadence/values';
import { Script } from '../scripts';

export class FreshmintEncodingContract {
  getSource(): string {
    return FreshmintEncodingGenerator.contract();
  }

  encode(value: string, type: CadenceType): Script<string> {
    return new Script(
      ({ imports }) => ({
        script: FreshmintEncodingGenerator.encode({ imports, type: type.label }),
        args: (arg) => [arg(value, type)],
        computeLimit: 9999,
      }),
      (result) => result,
    );
  }
}
