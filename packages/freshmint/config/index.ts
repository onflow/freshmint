import * as metadata from '@freshmint/core/metadata';

import { ConfigValidationError } from './errors';
import * as config from './config';

const defaultConfigPath = 'freshmint.yaml';
const defaultDataPathStandard = 'nfts.csv';
const defaultDataPathEdition = 'editions.csv';
const defaultAssetPath = 'assets';

export type FreshmintConfig = {
  name: string;
  description: string;
  contract: ContractConfig;
  ipfsPinningService: IPFSPinningServiceConfig;
  nftDataPath: string;
  nftAssetPath: string;
};

export type ContractConfig = {
  name: string;
  type: ContractType;
  schema: metadata.Schema;
};

export enum ContractType {
  Standard = 'standard',
  Edition = 'edition',
}

function isValidContractType(value: string): boolean {
  return Object.values<string>(ContractType).includes(value);
}

export type IPFSPinningServiceConfig = {
  endpoint: URL;
  key: string;
};

const freshmintConfigSchema = getConfigSchema();
export type FreshmintConfigSchema = typeof freshmintConfigSchema;

export function loadConfig(modifySchema?: (schema: FreshmintConfigSchema) => void): FreshmintConfig {
  const reader = new config.ConfigReader<FreshmintConfig, FreshmintConfigSchema>(freshmintConfigSchema);

  if (modifySchema) {
    reader.modifySchema(modifySchema);
  }

  return reader.load(defaultConfigPath);
}

export function saveConfig(
  name: string,
  description: string,
  contract: ContractConfig,
  ipfsPinningServiceEndpoint: string,
  ipfsPinningServiceKey: string,
  basePath?: string,
) {
  new config.ConfigWriter<FreshmintConfigSchema>(freshmintConfigSchema)
    .setValues((schema) => {
      schema.name.setValue(name);
      schema.description.setValue(description);

      schema.contract.setValue(contract);

      schema.ipfsPinningService.setRawValue({
        endpoint: ipfsPinningServiceEndpoint,
        key: ipfsPinningServiceKey,
      });
    })
    .write(defaultConfigPath, basePath);
}

export function getDefaultDataPath(contractType: ContractType): string {
  switch (contractType) {
    case ContractType.Standard:
      return defaultDataPathStandard;
    case ContractType.Edition:
      return defaultDataPathEdition;
  }
}

function getConfigSchema() {
  const name = config.Field<string>('name');
  const description = config.Field<string>('description');

  const contract = config.Map<ContractConfig>('contract', {
    name: config.Field<string>('name'),
    type: config.Field<ContractType>('type', parseContractType),
    schema: config.Field<metadata.Schema>(
      'schema',
      (input: metadata.SchemaInput) => metadata.parseSchema(input),
      (schema: metadata.Schema) => schema.export(),
    ),
  });

  const ipfsPinningService = config
    .Map<IPFSPinningServiceConfig>('ipfsPinningService', {
      endpoint: config.Field<URL>('endpoint', parseURL),
      key: config.Field<string>('key'),
    })
    .setEnabled(false);

  const nftDataPath = config.Field<string>('nftDataPath').setEnabled(false);
  const nftAssetPath = config.Field<string>('nftAssetPath').setDefault(defaultAssetPath);

  // We can only set the default data path once we know
  // the contract type (and only if it is a valid contract type).
  contract.fields.type.onLoad((contractType) => {
    nftDataPath.setEnabled(true).setDefault(getDefaultDataPath(contractType));
  });

  return {
    name,
    description,
    contract,
    ipfsPinningService,
    nftDataPath,
    nftAssetPath,
  };
}

function parseContractType(input: string): ContractType {
  if (!isValidContractType(input)) {
    throw new ConfigValidationError(
      `"${input}" is not a valid contract type. This field must be either "${ContractType.Standard}" or "${ContractType.Edition}".`,
    );
  }

  return input as ContractType;
}

function parseURL(input: string, rawInput: string): URL {
  try {
    return new URL(input);
  } catch {
    throw new ConfigValidationError(
      `"${input}" is not a valid URL${input !== rawInput ? ` (loaded from "${rawInput}").` : '.'}`,
    );
  }
}
