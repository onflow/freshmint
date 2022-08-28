import * as path from 'path';
import * as dotenv from 'dotenv';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';

import { metadata } from '../../lib';
import { envsubst } from './envsubst';
import { ConfigErrors, ConfigValidationError } from './errors';
import { FreshmintError } from '../errors';

export type ConfigValueTransformer<T> = (input: any, rawInput: any) => T

interface ConfigValue<T> {
  label: string;
  resolve(depth?: number): T
}

interface ConfigValues { [name: string]: ConfigValue<any> }

class ConfigObject<T extends { [key: string]: any }> {
  label: string;
  values: ConfigValues

  constructor(label: string, fields: ConfigValues ) {
    this.label = label;
    this.values = fields;
  }

  resolve(depth: number = 0): T {
    const result = {};
    const errors: { label: string, error: Error }[] = []

    for (const name in this.values) {
      const value = this.values[name];
      try {
        const resolvedValue = value.resolve(depth + 1);
        result[name] = resolvedValue;
      } catch (error: any){
        if (error instanceof FreshmintError) {
          errors.push({ label: value.label, error: error })
        } else {
          throw error;
        }
      }
    }

    if (errors.length) {
      throw new ConfigErrors(errors, depth)
    }

    return result as T;
  }
}

export class ConfigField<T> {

  label: string;
  value?: T = undefined;
  defaultValue?: T;
  rawValue: any;
  #transform: ConfigValueTransformer<T>

  constructor(
    label: string,
    rawValue: any,
    transform: ConfigValueTransformer<T> = (rawValue: any) => rawValue,
  ) {
    this.label = label;
    this.rawValue = rawValue;
    this.#transform = transform;
  }

  setDefault(defaultValue: T): ConfigField<T> {
    this.defaultValue = defaultValue;
    return this;
  }

  resolve(depth: number = 0): T {
    if (this.value !== undefined) {
      return this.value;
    }

    if (this.rawValue === undefined) {
      return this.defaultValue;
    }

    let value = this.rawValue

    if (typeof this.rawValue === 'string') {
      // If the value is a string, first attempt
      // to substitute environment variables before
      // validating and transforming.
      value = envsubst(this.rawValue);
    }

    // Pass rawValue to transformer. This allows us to tell the user
    // which environment variable(s) stored an invalid value.
    const finalValue = this.#transform(value, this.rawValue)

    this.value = finalValue;

    return finalValue;
  }
}

export enum ContractType {
  Standard = 'standard',
  Edition = 'edition',
}

const defaultDataPathStandard = 'nfts.csv';
const defaultDataPathEdition = 'editions.csv';
const defaultAssetPath = 'assets';

export type ContractConfig = {
  name: string;
  type: ContractType;
  schema: metadata.Schema;
};

export type IPFSPinningServiceConfig = {
  endpoint: URL;
  key: string;
};

export type ConfigParameters = {
  contract: ConfigObject<ContractConfig>;

  nftDataPath: ConfigValue<string>;
  nftAssetPath: ConfigValue<string>;

  ipfsPinningService: ConfigObject<IPFSPinningServiceConfig>;
};

export class Config {
  #config: ConfigParameters;

  #requiredFields: { field: ConfigValue<any>, onResolve?: (value: any) => void }[];

  constructor(config: ConfigParameters) {
    this.#config = config;
    this.#requiredFields = [];
  }

  get contract(): ConfigObject<ContractConfig> {
    return this.#config.contract;
  }

  get nftDataPath(): ConfigValue<string> {
    return this.#config.nftDataPath; // ?? this.getDefaultDataPath();
  }

  static getDefaultDataPath(contractType: ContractType): string {
    switch (contractType) {
      case ContractType.Standard:
        return defaultDataPathStandard;
      case ContractType.Edition:
        return defaultDataPathEdition;
    }
  }

  get nftAssetPath(): ConfigValue<string> {
    return this.#config.nftAssetPath;
  }

  get ipfsPinningService(): ConfigObject<IPFSPinningServiceConfig> {
    return this.#config.ipfsPinningService;
  }

  static load(): Config {
    const rawConfig = loadRawConfig(configFilename);

    return new Config({
      contract: new ConfigObject<ContractConfig>('contract', {
        name: new ConfigField<string>('name', rawConfig.contract.name),
        type: new ConfigField<ContractType>('type', rawConfig.contract.type as ContractType),
        schema: new ConfigField<metadata.Schema>(
          'schema',
          rawConfig.contract.schema,
          (rawValue: metadata.SchemaInput) => metadata.parseSchema(rawValue),
        ),
      }),

      ipfsPinningService: new ConfigObject<IPFSPinningServiceConfig>('ipfsPinningService', {
        endpoint: new ConfigField<URL>(
          "endpoint",
          rawConfig.ipfsPinningService.endpoint, 
          parseURL
        ),
        key: new ConfigField<string>("key", rawConfig.ipfsPinningService.key),
      }),

      nftDataPath: new ConfigField<string>('nftDataPath', rawConfig.nftDataPath),
      nftAssetPath: new ConfigField<string>('nftAssetPath', rawConfig.nftAssetPath).setDefault(defaultAssetPath),
    });
  }

  setRequired<T = any>(field: ConfigValue<T>, onResolve?: (value: T) => void): Config {
    this.#requiredFields.push({ field, onResolve })
    return this;
  }

  resolve() {
    const errors: { label: string, error: Error }[] = []

    let current: { field: ConfigValue<any>, onResolve?: (value: any) => void }

    while (current = this.#requiredFields.pop()) {
      try {
        const value = current.field.resolve(1);
        if (current.onResolve) {
          current.onResolve(value)
        }
      } catch (error: any){
        if (error instanceof FreshmintError) {
          errors.push({ label: current.field.label, error: error })
        } else {
          throw error;
        }
      }
    }

    if (errors.length) {
      throw new ConfigErrors(errors, 0, `Invalid configuration in ${configFilename}`)
    }
  }

  save(basePath?: string) {
    const rawConfig = {
      contract: {
        name: this.#config.contract.resolve().name,
        type: this.#config.contract.resolve().type,
        schema: this.#config.contract.resolve().schema.export(),
      },

      ipfsPinningService: {
        endpoint: this.#config.ipfsPinningService.resolve().endpoint.toString(),
        key: this.#config.ipfsPinningService.resolve().key
      },

      nftDataPath: this.#config.nftDataPath.resolve(),
      nftAssetPath: this.#config.nftAssetPath.resolve(),
    };

    saveRawConfig(configFilename, rawConfig, basePath);
  }
}

type RawConfig = {
  contract: {
    name: string;
    type: string;
    schema: metadata.SchemaInput;
  };

  ipfsPinningService: {
    endpoint: string;
    key: string;
  };

  nftDataPath: string;
  nftAssetPath: string;
};

const configFilename = 'freshmint.yaml';

function loadRawConfig(filename: string, basePath?: string): RawConfig {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });

  const filepath = path.resolve(basePath ?? process.cwd(), filename);
  const contents = fs.readFileSync(filepath, 'utf8');

  const config = yaml.load(contents);

  return config as RawConfig;
}

function saveRawConfig(filename: string, config: RawConfig, basePath?: string) {
  const filepath = path.resolve(basePath ?? process.cwd(), filename);

  const contents = yaml.dump(config);

  fs.writeFileSync(filepath, contents, 'utf8');
}

function parseURL(input: string, rawInput: string): URL {
  try {
    return new URL(input);
  } catch {
    throw new ConfigValidationError(`"${input}" is not a valid URL${input !== rawInput ? ` (loaded from "${rawInput}").` : '.'}`)
  }
}
