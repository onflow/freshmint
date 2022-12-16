import * as yup from 'yup';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';
import chalk from 'chalk';
import * as metadata from '@freshmint/core/metadata';
import { Royalty } from '@freshmint/core';

import { FreshmintError } from './errors';
import { FlowNetwork } from './flow';
import { envsubst } from './envsubst';

const defaultConfigPath = 'freshmint.yaml';
const defaultDataPathStandard = 'nfts.csv';
const defaultDataPathEdition = 'editions.csv';
const defaultAssetPath = 'assets';

export class FreshmintConfig {
  contract: ContractConfig;
  collection: CollectionConfig;
  royalties: RoyaltiesConfig;
  ipfsPinningService: IPFSPinningServiceConfig;
  nftDataPath: string;
  nftAssetPath: string;

  constructor(config: FreshmintConfigInput) {
    this.contract = config.contract;
    this.collection = config.collection;
    this.royalties = config.royalties;
    this.ipfsPinningService = config.ipfsPinningService;
    this.nftDataPath = config.nftDataPath;
    this.nftAssetPath = config.nftAssetPath;
  }

  getContractAccount(network: FlowNetwork): string {
    const account = this.contract.account[network];
    if (!account) {
      throw new MissingContractAccountForNetworkError(network);
    }

    return account;
  }

  parseIPFSPinningServiceConfig(): { endpoint: URL; token: string } {
    const errors: Error[] = [];

    let endpoint: URL;
    let token: string;

    try {
      endpoint = new URL(envsubst(this.ipfsPinningService.endpoint));
    } catch (err: any) {
      errors.push(err as Error);
    }

    try {
      token = envsubst(this.ipfsPinningService.key);
    } catch (err: any) {
      errors.push(err as Error);
    }

    if (errors.length > 0) {
      throw new ConfigValidationError(errors);
    }

    // @ts-ignore
    return { endpoint, token };
  }
}

export class ConfigValidationError extends FreshmintError {
  constructor(errors: Error[]) {
    const errorMessages = errors.map((error) => error.message);
    const message = `Your freshmint.yaml file is invalid:\n\n${errorMessages.join('\n')}`;
    super(message);
  }
}

export class MissingContractAccountForNetworkError extends FreshmintError {
  network: string;

  constructor(network: string) {
    super(
      `Please specify a contract account for the "${network}" network.\n\nExample in freshmint.yaml:${chalk.cyan(
        `\n\ncontract:\n  account:\n    ${network}: your-account-name (as defined in flow.json)`,
      )}`,
    );
    this.network = network;
  }
}

export interface FreshmintConfigInput {
  contract: ContractConfig;
  collection: CollectionConfig;
  royalties: RoyaltiesConfig;
  ipfsPinningService: IPFSPinningServiceConfig;
  nftDataPath: string;
  nftAssetPath: string;
}

export interface ContractConfig {
  name: string;
  type: ContractType;
  schema: metadata.Schema;
  account: ContractAccount;
}

export enum ContractType {
  Standard = 'standard',
  Edition = 'edition',
}

export interface ContractAccount {
  emulator?: string;
  testnet?: string;
  mainnet?: string;
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

export interface RoyaltiesConfig {
  emulator: Royalty[];
  testnet: Royalty[];
  mainnet: Royalty[];
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
    const entries = keys.map((key) => [key, yup.string().required()]);
    const shape = Object.fromEntries(entries);

    return yup.object().required().shape(shape);
  });
}

const royaltySchema = {
  address: yup.string().required(),
  receiverPath: yup.string().required(),
  cut: yup.string().required(),
  description: yup.string().optional(),
};

const schema: yup.ObjectSchema<FreshmintConfigInput> = yup.object({
  contract: yup
    .object({
      name: yup.string().required(),
      type: yup.string().oneOf(Object.values(ContractType)).required(),
      schema: yup
        .mixed((input): input is metadata.Schema => input instanceof metadata.Schema)
        .transform((value) => metadata.parseSchema(value))
        .required(),
      account: yup.object({
        emulator: yup.string(),
        testnet: yup.string(),
        mainnet: yup.string(),
      }),
    })
    .required(),
  collection: yup
    .object({
      name: yup.string().required(),
      description: yup.string().required(),
      url: yup.string().required(),
      images: yup
        .object({
          square: yup.string().required(),
          banner: yup.string().required(),
        })
        .required(),
      socials: stringMap(),
    })
    .required(),
  royalties: yup.object({
    emulator: yup.array(yup.object(royaltySchema)).default([]),
    testnet: yup.array(yup.object(royaltySchema)).default([]),
    mainnet: yup.array(yup.object(royaltySchema)).default([]),
  }),
  ipfsPinningService: yup
    .object()
    // IPFS configuration is required when using an IPFS file field
    .when('contract.schema', {
      is: (schema: metadata.Schema) => {
        return schema.includesFieldType(metadata.IPFSFile);
      },
      then: (schema) => schema.required(),
    })
    .shape({
      endpoint: yup.string().required(),
      key: yup.string().required(),
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

  try {
    const config = await schema.validate(rawConfig, { abortEarly: false });
    return new FreshmintConfig(config);
  } catch (err: any) {
    if (err instanceof yup.ValidationError) {
      throw new ConfigValidationError(err.inner);
    }

    throw err;
  }
}

function loadRawConfig(filename: string, basePath?: string): any {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });

  const filepath = path.resolve(basePath ?? process.cwd(), filename);
  const contents = fs.readFileSync(filepath, 'utf8');

  // Parse using FAILSAFE_SCHEMA so that addresses (e.g. 0xf8d6e0586b0a20c7)
  // are interpreted as strings rather than integers.
  //
  return yaml.load(contents, { schema: yaml.FAILSAFE_SCHEMA });
}

export function getDefaultDataPath(contractType: ContractType): string {
  switch (contractType) {
    case ContractType.Standard:
      return defaultDataPathStandard;
    case ContractType.Edition:
      return defaultDataPathEdition;
  }
}
