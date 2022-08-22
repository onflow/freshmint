import { Config } from '@fresh-js/core';

import { FreshmintClient } from '../client';
import NFTContract from '../contracts/NFTContract';

export default interface NFTCollection {
  config: Config;
  client: FreshmintClient;
  contract: NFTContract;
}
