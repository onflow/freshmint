import { LegacyFreshmintConfig } from '../config';
import { FreshmintClient } from '../client';
import NFTContract from '../contracts/NFTContract';

export default interface NFTCollection {
  config: LegacyFreshmintConfig;
  client: FreshmintClient;
  contract: NFTContract;
}
