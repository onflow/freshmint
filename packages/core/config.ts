export type ContractImports = { [key: string]: string };

export type FreshmintConfig = {
  imports: ContractImports;
};

export type LegacyFreshmintConfig = {
  host: string;
  contracts: {
    [key: string]: string;
  };
};

export const EMULATOR: FreshmintConfig = {
  imports: {
    FungibleToken: '0xee82856bf20e2aa6',
    NonFungibleToken: '0xf8d6e0586b0a20c7',
    FlowToken: '0x0ae53cb6e3f42a79',
    MetadataViews: '0xf8d6e0586b0a20c7',
    FreshmintEncoding: '0xf8d6e0586b0a20c7',
    FreshmintMetadataViews: '0xf8d6e0586b0a20c7',
    FreshmintClaimSale: '0xf8d6e0586b0a20c7',
    FreshmintLockBox: '0xf8d6e0586b0a20c7',
  },
};

export const TESTNET: FreshmintConfig = {
  imports: {
    FungibleToken: '0x9a0766d93b6608b7',
    NonFungibleToken: '0x631e88ae7f1d7c20',
    MetadataViews: '0x631e88ae7f1d7c20',
    FreshmintMetadataViews: '0xc270e330615c6fa0',
    FreshmintClaimSale: '0x2d3d6874bc231156',
    FreshmintLockBox: '0x0cad7d1c09a3a433',
  },
};

export const MAINNET: FreshmintConfig = {
  imports: {
    FungibleToken: '0xf233dcee88fe0abe',
    NonFungibleToken: '0x1d7e57aa55817448',
    MetadataViews: '0x1d7e57aa55817448',
    FreshmintMetadataViews: '0x0c82d33d4666f1f7',
    FreshmintClaimSale: '0x16a3117d86821389',
    FreshmintLockBox: '0xdd1c2c328f849078',
  },
};
