import * as fs from 'fs/promises';
import { CollectionMetadata } from '@freshmint/core';

// @ts-ignore
import * as mime from 'mime-types';

import { FreshmintConfig } from './config';
import { FreshmintError } from './errors';
import { FlowGateway, FlowNetwork } from './flow';
import { FlowJSONConfig } from './flow/config';

const flowJSONConfigPath = 'flow.json';

export async function deployNFTContract(config: FreshmintConfig, flow: FlowGateway, network: FlowNetwork) {
  const contractName = config.contract.name;
  const flowConfig = await FlowJSONConfig.load(flowJSONConfigPath);

  const contractPath = flowConfig.getContract(contractName);

  if (!contractPath) {
    throw new FreshmintError(`Contract ${contractName} is not defined in flow.json.`);
  }

  const collectionMetadata: CollectionMetadata = {
    name: config.collection.name,
    description: config.collection.description,
    url: config.collection.url,
    squareImage: {
      url: config.collection.images.square,
      type: mime.lookup(config.collection.images.square),
    },
    bannerImage: {
      url: config.collection.images.banner,
      type: mime.lookup(config.collection.images.banner),
    },
    socials: config.collection.socials,
  };

  const royalties = config.royalties[network];

  const contract = await fs.readFile(contractPath, 'utf-8');

  await flow.deploy(contractName, contract, collectionMetadata, royalties);
}
