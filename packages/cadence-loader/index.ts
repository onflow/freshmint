import * as fs from 'fs';

// @ts-ignore
import { withPrefix } from '@onflow/fcl';

// @ts-ignore
import { extractImports } from '@onflow/flow-cadut';

import envsubst from '@tuplo/envsubst';
import { validate } from 'schema-utils';

const schema: any = {
  type: 'object',
  properties: {
    flowConfig: {
      anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    },
  },
  required: ['flowConfig'],
};

function parseFlowConfigFile(configPath: string) {
  const rawConfig = fs.readFileSync(configPath).toString('utf8');
  const substitutedConfig = envsubst(rawConfig);
  return JSON.parse(substitutedConfig);
}

function parseFlowConfigFiles(configPaths: string[]) {
  const configs = configPaths.map((configPath) => parseFlowConfigFile(configPath));
  return mergeDeep({}, ...configs);
}

function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}

function mergeDeep(target: any, ...sources: any[]): any {
  if (!sources.length) {
    return target;
  }

  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key])
          Object.assign(target, {
            [key]: {},
          });
        mergeDeep(target[key], source[key]);
      } else {
        Object.assign(target, {
          [key]: source[key],
        });
      }
    }
  }

  return mergeDeep(target, ...sources);
}

type AddressMap = { [contractName: string]: string };
type AddressMaps = { [network: string]: AddressMap };

function getAddressMapsFromFlowConfig(configPath: string | string[]): AddressMaps {
  const configPaths = Array.isArray(configPath) ? configPath : [configPath];

  const config = parseFlowConfigFiles(configPaths);

  return {
    emulator: getAddressMapForNetwork(config, 'emulator'),
    testnet: getAddressMapForNetwork(config, 'testnet'),
    mainnet: getAddressMapForNetwork(config, 'mainnet'),
  };
}

type FlowConfigContracts = { [contractName: string]: FlowConfigAdvancedContract };
type FlowConfigContract = string | FlowConfigAdvancedContract;
type FlowConfigAdvancedContract = { source: string; aliases: { [network: string]: string } };

export function isAdvancedContract(contract: FlowConfigContract): contract is FlowConfigAdvancedContract {
  return (contract as FlowConfigAdvancedContract).aliases !== undefined;
}

type FlowConfigDeployments = { [network: string]: FlowConfigNetworkDeployments };
type FlowConfigNetworkDeployments = { [accountName: string]: string[] };

type FlowConfigAccounts = { [accountName: string]: { address: string } };

interface FlowConfig {
  contracts?: FlowConfigContracts;
  deployments?: FlowConfigDeployments;
  accounts: FlowConfigAccounts;
}

function getAddressMapForNetwork(config: FlowConfig, network: string) {
  return {
    ...getAddressMapFromDeployments(config, network),
    ...getAddressMapFromContracts(config, network),
  };
}

function getAddressMapFromDeployments(config: FlowConfig, network: string): AddressMap {
  const accounts = config.deployments?.[network];
  if (!accounts) {
    return {};
  }

  const imports: AddressMap = {};

  for (const accountName in accounts) {
    const address = getAccountAddress(config, accountName);

    const contracts = accounts[accountName];

    for (const contractName of contracts) {
      imports[contractName] = address;
    }
  }

  return imports;
}

function getAddressMapFromContracts(config: FlowConfig, network: string): AddressMap {
  const imports: AddressMap = {};

  for (const contractName in config.contracts) {
    const contract = config.contracts[contractName];

    if (!isAdvancedContract(contract)) {
      continue;
    }

    const aliases = contract.aliases ?? {};

    const address = aliases[network];

    if (address) {
      imports[contractName] = address;
    }
  }

  return imports;
}

function getAccountAddress(config: FlowConfig, name: string) {
  return withPrefix(config.accounts[name].address) as string;
}

type ContractImportMap = { [network: string]: ContractImport[] };

interface ContractImport {
  name: string;
  source: string;
  target: string;
}

function createImportMap(addressMaps: AddressMaps, extractedImports: AddressMap): ContractImportMap {
  const imports: ContractImportMap = {};

  for (const network in addressMaps) {
    imports[network] = transformImports(addressMaps[network], extractedImports);
  }

  return imports;
}

function transformImports(targets: AddressMap, sources: AddressMap) {
  const importList: ContractImport[] = [];

  for (const name in sources) {
    const source = sources[name];
    const target = targets[name];

    importList.push({ name, source, target });
  }

  return importList;
}

function createCadenceModule(source: string, imports: ContractImportMap) {
  return `export const raw = \`${source}\`;

export const imports = {
  emulator: ${JSON.stringify(imports.emulator)},
  testnet: ${JSON.stringify(imports.testnet)},
  mainnet: ${JSON.stringify(imports.mainnet)}
};

export function resolve(network, overrides = {}) {
  const contracts = imports[network];
  return contracts.reduce((cadence, contract) => cadence.replace(contract.source, overrides[contract.name] ?? contract.target), raw)
};

const module = { raw, imports, resolve };

export default module;
`;
}

type WebpackLoader = {
  getOptions: () => any;
};

export default function loader(this: WebpackLoader, source: string): string {
  const options = this.getOptions();

  validate(schema, options);

  const addressMaps = getAddressMapsFromFlowConfig(options.flowConfig);

  const extractedImports = extractImports(source);

  const imports = createImportMap(addressMaps, extractedImports);

  return createCadenceModule(source, imports);
}
