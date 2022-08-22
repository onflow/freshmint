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

export type ContractFreshmintConfig = {
  name: string;
  type: ContractType;
  schema: metadata.Schema;
};

export type IPFSPinningServiceFreshmintConfig = {
  endpoint: URL;
  key: string;
};

export type FreshmintConfigParameters = {
  contract: ContractFreshmintConfig;

  nftDataPath?: string;
  nftAssetPath?: string;

  ipfsPinningService?: {
    endpoint: string;
    key: string;
  };
};

export class FreshmintConfig {
  #config: FreshmintConfigParameters;

  constructor(config: FreshmintConfigParameters) {
    this.#config = config;
  }

  get contract(): ContractFreshmintConfig {
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

  get ipfsPinningService(): IPFSPinningServiceFreshmintConfig {
    const endpoint = envsubst(this.#config.ipfsPinningService.endpoint);
    const key = envsubst(this.#config.ipfsPinningService.key);

    return {
      endpoint: new URL(endpoint),
      key,
    };
  }

  static load(): FreshmintConfig {
    const rawFreshmintConfig = loadRawFreshmintConfig(configFilename);

    return new FreshmintConfig({
      contract: {
        name: rawFreshmintConfig.contract.name,
        type: rawFreshmintConfig.contract.type as ContractType,
        schema: metadata.parseSchema(rawFreshmintConfig.contract.schema || []),
      },

      ipfsPinningService: rawFreshmintConfig.ipfsPinningService,

      nftDataPath: rawFreshmintConfig.nftDataPath,
      nftAssetPath: rawFreshmintConfig.nftAssetPath,
    });
  }

  save(basePath?: string) {
    const rawFreshmintConfig = {
      contract: {
        name: this.#config.contract.name,
        type: this.#config.contract.type,
        schema: this.#config.contract.schema.export(),
      },

      ipfsPinningService: this.#config.ipfsPinningService,

      nftDataPath: this.#config.nftDataPath,
      nftAssetPath: this.#config.nftAssetPath,
    };

    saveRawFreshmintConfig(configFilename, rawFreshmintConfig, basePath);
  }
}

type RawFreshmintConfig = {
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

function loadRawFreshmintConfig(filename: string, basePath?: string): RawFreshmintConfig {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });

  const filepath = path.resolve(basePath ?? process.cwd(), filename);
  const contents = fs.readFileSync(filepath, 'utf8');

  const config = yaml.load(contents);

  return config as RawFreshmintConfig;
}

function saveRawFreshmintConfig(filename: string, config: RawFreshmintConfig, basePath?: string) {
  const filepath = path.resolve(basePath ?? process.cwd(), filename);

  const contents = yaml.dump(config);

  fs.writeFileSync(filepath, contents, 'utf8');
}
