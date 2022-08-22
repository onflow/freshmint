import * as util from 'util';
const exec = util.promisify(require('child_process').exec); // eslint-disable-line  @typescript-eslint/no-var-requires

// @ts-ignore
import { decode } from '@onflow/decode';

function escapeForShell(s: string) {
  return '"' + s.replace(/(["$`\\])/g, '\\$1') + '"';
}

function formatArgString(args: any[]) {
  const cadenceArgs = args.map((v) => v.type.asArgument(v.value));
  return escapeForShell(JSON.stringify(cadenceArgs));
}

function formatFreshmintConfigString(configs: string[]) {
  return configs.map((c) => `-f ${c}`).join(' ');
}

export default class FlowCliWrapper {
  network: string;
  configs: string[];

  constructor(network: string) {
    if (!network) network = 'emulator';

    const configs = ['flow.json'];

    if (network === 'testnet') {
      configs.push('flow.testnet.json');
    } else if (network === 'mainnet') {
      configs.push('flow.mainnet.json');
    }

    this.network = network;
    this.configs = configs;
  }

  async transaction(path: string, signer: string, args: any[]) {
    const argString = formatArgString(args);
    const configString = formatFreshmintConfigString(this.configs);

    const { stdout: out, stderr: err } = await exec(
      `flow transactions send \
        --network=${this.network} \
        --signer ${signer} \
        ${configString} \
        -o json \
        --args-json ${argString} \
        ${path}`,
      { cwd: process.cwd() },
    );

    if (err) {
      throw new Error(err);
    }

    const result = JSON.parse(out);

    if (result.error) {
      throw new Error(result.error);
    }

    return result;
  }

  async script(path: string, args: any[]) {
    const argString = formatArgString(args);
    const configString = formatFreshmintConfigString(this.configs);

    const { stdout: out, stderr: err } = await exec(
      `flow scripts execute \
        --network=${this.network} \
        ${configString} \
        -o json \
        --args-json ${argString} \
        ${path}`,
      { cwd: process.cwd() },
    );

    if (err) {
      throw err;
    }

    const result = JSON.parse(out);

    return await decode(result);
  }
}
