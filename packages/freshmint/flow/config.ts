import * as fs from 'fs/promises';

export class FlowJSONConfig {
  // TODO: define type structure for flow.json
  config: any;

  constructor(config: any) {
    this.config = config;
  }

  static async load(configPath: string): Promise<FlowJSONConfig> {
    const rawConfig = await fs.readFile(configPath);
    const config = JSON.parse(rawConfig.toString('utf-8'));

    return new FlowJSONConfig(config);
  }

  getContract(name: string): string | null {
    const contract = this.config.contracts[name] ?? null;

    if (typeof contract === 'string') {
      return contract;
    }

    return contract.source;
  }
}
