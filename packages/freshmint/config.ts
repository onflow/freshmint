import * as yup from 'yup';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';
import chalk from 'chalk';
import * as metadata from '@freshmint/core/metadata';

import { FreshmintError } from './errors';

const defaultConfigPath = 'freshmint.yaml';
const defaultDataPathStandard = 'nfts.csv';
const defaultDataPathEdition = 'editions.csv';
const defaultAssetPath = 'assets';

export class FreshmintConfig {
  contract: ContractConfig;
  collection: CollectionConfig;
  ipfsPinningService: IPFSPinningServiceConfig;
  nftDataPath: string;
  nftAssetPath: string;

  constructor(config: FreshmintConfigInput) {
    this.contract = config.contract;
    this.collection = config.collection;
    this.ipfsPinningService = config.ipfsPinningService;
    this.nftDataPath = config.nftDataPath;
    this.nftAssetPath = config.nftAssetPath;
  }

  getContractAccount(network: string): string {
    const account = this.contract.account[network];
    if (!account) {
      throw new MissingContractAccountForNetworkError(network);
    }

    return account;
  }
}

export class MissingContractAccountForNetworkError extends FreshmintError {
  network: string;

  constructor(network: string) {
    super(
      `Please specify a contract account for the "${network}" network.\n\nExample in ${chalk.green(
        'freshmint.yaml',
      )}:${chalk.cyan(`\n\ncontract:\n  account:\n    ${network}: your-account-name (as defined in flow.json)`)}`,
    );
    this.network = network;
  }
}

export interface FreshmintConfigInput {
  contract: ContractConfig;
  collection: CollectionConfig;
  ipfsPinningService: IPFSPinningServiceConfig;
  nftDataPath: string;
  nftAssetPath: string;
}

export type AccountsByNetwork = { [network: string]: string };

export interface ContractConfig {
  name: string;
  type: ContractType;
  schema: metadata.Schema;
  account: AccountsByNetwork;
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

// Yup does not have built-in support for a map schema so we construct one lazily.
// Ref: https://github.com/jquense/yup/issues/1275
//
function stringMap() {
  return yup.lazy((value) => {
    const keys = Object.keys(value ?? {});
    const entries = keys.map((key) => [key, yup.string().defined()]);
    const shape = Object.fromEntries(entries);

    return yup.object().defined().shape(shape);
  });
}

const schema: yup.ObjectSchema<FreshmintConfigInput> = yup.object().shape({
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
      account: stringMap(),
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
      socials: stringMap(),
    }),
  ipfsPinningService: yup
    .object()
    // IPFS configuration is required when using an IPFS file field
    .when('contract.schema', {
      is: (schema: metadata.Schema) => {
        return schema.includesFieldType(metadata.IPFSFile);
      },
      then: (schema) => schema.defined(),
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
  const config = await schema.validate(rawConfig);

  return new FreshmintConfig(config);
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
