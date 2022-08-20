import { Config } from '@fresh-js/core';

import { FlowClient } from '../client';
import NFTContract from '../contracts/NFTContract';

export default interface NFTCollection {
  config: Config;
  client: FlowClient;
  contract: NFTContract;
}
