import * as yup from 'yup';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';
import * as metadata from '@freshmint/core/metadata';

const defaultConfigPath = 'freshmint.yaml';
const defaultDataPathStandard = 'nfts.csv';
const defaultDataPathEdition = 'editions.csv';
const defaultAssetPath = 'assets';

export interface FreshmintConfig {
  contract: ContractConfig;
  ipfsPinningService: IPFSPinningServiceConfig;
  nftDataPath: string;
  nftAssetPath: string;
}

export interface ContractConfig {
  name: string;
  type: ContractType;
  schema: metadata.Schema;
}

export enum ContractType {
  Standard = 'standard',
  Edition = 'edition',
}

export interface IPFSPinningServiceConfig {
  endpoint: string;
  key: string;
}

const schema: yup.ObjectSchema<FreshmintConfig> = yup.object().shape({
  contract: yup
    .object()
    .shape({
      name: yup.string().defined(),
      type: yup.string().oneOf(Object.values(ContractType)).required(),
      schema: yup
        .mixed((input): input is metadata.Schema => input instanceof metadata.Schema)
        .transform((value) => metadata.parseSchema(value))
        .defined(),
    })
    .defined(),
  ipfsPinningService: yup.object({
    endpoint: yup.string().defined(),
    key: yup.string().defined(),
  }),
  nftDataPath: yup.string().when('contract.type', {
    is: ContractType.Standard,
    then: (schema) => schema.default(defaultDataPathStandard),
    otherwise: (schema) => schema.default(defaultDataPathEdition),
  }),
  nftAssetPath: yup.string().default(defaultAssetPath),
});

export async function loadConfig(): Promise<FreshmintConfig> {
  const rawConfig = loadRawConfig(defaultConfigPath);

  return (await schema.validate(rawConfig)) as FreshmintConfig;
}

function loadRawConfig(filename: string, basePath?: string): any {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });

  const filepath = path.resolve(basePath ?? process.cwd(), filename);
  const contents = fs.readFileSync(filepath, 'utf8');

  return yaml.load(contents);
}

export function getDefaultDataPath(contractType: ContractType): string {
  switch (contractType) {
    case ContractType.Standard:
      return defaultDataPathStandard;
    case ContractType.Edition:
      return defaultDataPathEdition;
  }
}
