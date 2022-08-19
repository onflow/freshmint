import * as path from 'path';
import * as dotenv from 'dotenv';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';
import envsubst from '@tuplo/envsubst';

import { metadata } from '../lib';

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
  contract: ContractConfig;

  nftDataPath?: string;
  nftAssetPath?: string;

  ipfsPinningService?: {
    endpoint: string;
    key: string;
  };
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
    const endpoint = envsubst(this.#config.ipfsPinningService.endpoint);
    const key = envsubst(this.#config.ipfsPinningService.key);

    return {
      endpoint: new URL(endpoint),
      key,
    };
  }

  static load(): Config {
    const rawConfig = loadRawConfig(configFilename);

    return new Config({
      contract: {
        name: rawConfig.contract.name,
        type: rawConfig.contract.type as ContractType,
        schema: metadata.parseSchema(rawConfig.contract.schema || []),
      },

      ipfsPinningService: rawConfig.ipfsPinningService,

      nftDataPath: rawConfig.nftDataPath,
      nftAssetPath: rawConfig.nftAssetPath,
    });
  }

  save(basePath?: string) {
    const rawConfig = {
      contract: {
        name: this.#config.contract.name,
        type: this.#config.contract.type,
        schema: this.#config.contract.schema.export(),
      },

      ipfsPinningService: this.#config.ipfsPinningService,

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
