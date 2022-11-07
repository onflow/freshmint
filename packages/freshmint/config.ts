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
  collection: CollectionConfig;
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

export interface CollectionConfig {
  name: string;
  description: string;
  url: string;
  images: {
    square: string;
    banner: string;
  };
  socials: { [key: string]: string };
}

export interface IPFSPinningServiceConfig {
  endpoint: string;
  key: string;
}

const schema: yup.ObjectSchema<FreshmintConfig> = yup.object().shape({
  contract: yup
    .object()
    .defined()
    .shape({
      name: yup.string().defined(),
      type: yup.string().oneOf(Object.values(ContractType)).required(),
      schema: yup
        .mixed((input): input is metadata.Schema => input instanceof metadata.Schema)
        .transform((value) => metadata.parseSchema(value))
        .defined(),
    }),
  collection: yup
    .object()
    .defined()
    .shape({
      name: yup.string().defined(),
      description: yup.string().defined(),
      url: yup.string().defined(),
      images: yup.object().defined().shape({
        square: yup.string().defined(),
        banner: yup.string().defined(),
      }),
      socials: yup.lazy((value) => {
        return yup
          .object()
          .defined()
          .shape(Object.fromEntries(Object.keys(value).map((key) => [key, yup.string().defined()])));
      }),
    }),
  ipfsPinningService: yup
    .object()
    // IPFS configuration is required when using an IPFS file field
    .when('contract.schema', {
      is: (schema: metadata.Schema) => {
        return schema.includesFieldType(metadata.IPFSFile)
      },
      then: (schema) => schema.defined()
    })
    .shape({
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
