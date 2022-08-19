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

export type ContractConfig = {
  name: string;
  type: ContractType;
  schema: metadata.Schema;
};

export type IPFSPinningServiceConfig = {
  endpoint: string;
  key: string;
};

export class Config {
  contract: ContractConfig;

  nftDataPath: string;
  nftAssetPath: string;

  ipfsPinningService?: IPFSPinningServiceConfig;

  constructor({
    contract,
    nftDataPath,
    nftAssetPath,
    ipfsPinningService,
  }: {
    contract: ContractConfig;

    nftDataPath?: string;
    nftAssetPath?: string;

    ipfsPinningService?: IPFSPinningServiceConfig;
  }) {
    this.contract = contract;

    this.nftDataPath = nftDataPath ?? 'nfts.csv';
    this.nftAssetPath = nftAssetPath ?? 'assets';

    this.ipfsPinningService = ipfsPinningService;
  }

  static load(): Config {
    const rawConfig = loadRawConfig(configFilename);

    return new Config({
      contract: {
        name: rawConfig.contract.name,
        type: ContractType[rawConfig.contract.type],
        schema: metadata.parseSchema(rawConfig.contract.schema || []),
      },

      ipfsPinningService: rawConfig.ipfsPinningService,

      nftDataPath: rawConfig.nftDataPath || 'nfts.csv',
      nftAssetPath: rawConfig.nftAssetPath || 'assets',
    });
  }

  save(basePath?: string) {
    const rawConfig = {
      contract: {
        name: this.contract.name,
        type: this.contract.type,
        schema: this.contract.schema.export(),
      },

      ipfsPinningService: this.ipfsPinningService,

      nftDataPath: this.nftDataPath,
      nftAssetPath: this.nftAssetPath,
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

  const substitutedContents = envsubst(contents);

  const config = yaml.load(substitutedContents);

  return config as RawConfig;
}

function saveRawConfig(filename: string, config: RawConfig, basePath?: string) {
  const filepath = path.resolve(basePath ?? process.cwd(), filename);

  const contents = yaml.dump(config);

  fs.writeFileSync(filepath, contents, 'utf8');
}
