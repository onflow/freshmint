import * as path from 'path';
import * as dotenv from 'dotenv';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';

import { metadata } from '../../lib';
import { ConfigErrors, ConfigValidationError } from './errors';
import { FreshmintError } from '../errors';
import { envsubst } from './envsubst';

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
  endpoint: LazyConfigField<URL>;
  key: LazyConfigField<string>;
};

export type ConfigParameters = {
  contract: ContractConfig;

  nftDataPath?: string;
  nftAssetPath?: string;

  ipfsPinningService: IPFSPinningServiceConfig;
};

export class Config {
  #config: ConfigParameters;

  constructor(config: ConfigParameters) {
    this.#config = config;
  }

  get contract(): ContractConfig {
    return this.#config.contract;
  }

  get nftDataPath(): string {
    return this.#config.nftDataPath ?? this.getDefaultDataPath();
  }

  private getDefaultDataPath(): string {
    switch (this.contract.type) {
      case ContractType.Standard:
        return defaultDataPathStandard;
      case ContractType.Edition:
        return defaultDataPathEdition;
    }
  }

  get nftAssetPath(): string {
    return this.#config.nftAssetPath ?? defaultAssetPath;
  }

  get ipfsPinningService(): IPFSPinningServiceConfig {
    return this.#config.ipfsPinningService;
  }

  static load(): Config {
    const rawConfig = loadRawConfig(configFilename);

    return new Config({
      contract: {
        name: rawConfig.contract.name,
        type: rawConfig.contract.type as ContractType,
        schema: metadata.parseSchema(rawConfig.contract.schema),
      },

      ipfsPinningService: {
        endpoint: new LazyConfigField<URL>(
          'ipfsPinningService.endpoint',
          rawConfig.ipfsPinningService.endpoint,
          parseURL,
        ),
        key: new LazyConfigField<string>('ipfsPinningService.key', rawConfig.ipfsPinningService.key),
      },

      nftDataPath: rawConfig.nftDataPath,
      nftAssetPath: rawConfig.nftAssetPath,
    });
  }

  static resolveLazyFields(...fields: LazyConfigField<any>[]): any[] {
    const values = [];
    const errors: { label: string; error: Error }[] = [];

    for (const field of fields) {
      try {
        const value = field.resolve();
        values.push(value);
      } catch (error: any) {
        if (error instanceof FreshmintError) {
          errors.push({ label: field.label, error: error });
        } else {
          throw error;
        }
      }
    }

    if (errors.length) {
      throw new ConfigErrors(errors, `Invalid configuration in ${configFilename}`);
    }

    return values;
  }

  save(basePath?: string) {
    const rawConfig = {
      contract: {
        name: this.#config.contract.name,
        type: this.#config.contract.type,
        schema: this.#config.contract.schema.export(),
      },

      ipfsPinningService: {
        endpoint: this.#config.ipfsPinningService.endpoint.input,
        key: this.#config.ipfsPinningService.key.input,
      },

      nftDataPath: this.#config.nftDataPath,
      nftAssetPath: this.#config.nftAssetPath,
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

export type ConfigValueTransformer<T> = (input: any, rawInput: any) => T;

export class LazyConfigField<T> {
  label: string;
  input: any;
  #transform: ConfigValueTransformer<T>;

  constructor(label: string, input: any, transform: ConfigValueTransformer<T> = (input: any) => input) {
    this.label = label;
    this.input = input;
    this.#transform = transform;
  }

  resolve(): T {
    let value = this.input;

    if (typeof this.input === 'string') {
      // If the value is a string, first attempt
      // to substitute environment variables before
      // validating and transforming.
      value = envsubst(this.input);
    }

    // Pass rawValue to transformer. This allows us to tell the user
    // which environment variable(s) stored an invalid value.
    return this.#transform(value, this.input);
  }
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
