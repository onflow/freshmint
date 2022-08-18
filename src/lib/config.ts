export type ContractImports = { [key: string]: string };

export type Config = {
  imports: ContractImports;
};

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Config {
  export const EMULATOR = {
    imports: {
      FungibleToken: '0xee82856bf20e2aa6',
      NonFungibleToken: '0xf8d6e0586b0a20c7',
      FlowToken: '0x0ae53cb6e3f42a79',
      MetadataViews: '0xf8d6e0586b0a20c7',
      NFTClaimSale: '0xf8d6e0586b0a20c7',
    },
  };

  export const TESTNET: Config = {
    imports: {
      FungibleToken: '0x9a0766d93b6608b7',
      NonFungibleToken: '0x631e88ae7f1d7c20',
      MetadataViews: '0x631e88ae7f1d7c20',
      NFTClaimSale: '0xc7cfd3d1b4951113',
    },
  };

  export const MAINNET: Config = {
    imports: {
      FungibleToken: '0xf233dcee88fe0abe',
      NonFungibleToken: '0x1d7e57aa55817448',
      MetadataViews: '0x1d7e57aa55817448',
      NFTClaimSale: '', // TODO: deploy NFTClaimSale to mainnet
    },
  };
}
