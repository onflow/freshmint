const decode = require("@onflow/decode").decode;
const util = require("util");
const exec = util.promisify(require("child_process").exec);

function escapeForShell(s) {
  return '"'+s.replace(/(["$`\\])/g,'\\$1')+'"';
};

function formatArgString(args) {
  const cadenceArgs = args.map((v) => v.type.asArgument(v.value));
  return escapeForShell(JSON.stringify(cadenceArgs));
}

function formatConfigString(configs) {
  return configs.map((c) => `-f ${c}`).join(" ");
}

class FlowCliWrapper {
  constructor(network) {
    if (!network) network = "emulator";

    let configs = ["flow.json"];

    if (network === "testnet") {
      configs.push("flow.testnet.json");
    } else if (network === "mainnet") {
      configs.push("flow.mainnet.json");
    }

    this.network = network;
    this.configs = configs;
  }

  async deploy() {
    const configString = formatConfigString(this.configs);

    const { stdout: out, stderr: err } = await exec(
      `flow project deploy \
        --network=${this.network} \
        ${configString} \
        --update \
        -o json`,
      { cwd: process.cwd() }
    );

    if (err) {
      throw err;
    }

    return JSON.parse(out);
  }

  async transaction(path, signer, args) {
    const argString = formatArgString(args);
    const configString = formatConfigString(this.configs);

    const { stdout: out, stderr: err } = await exec(
      `flow transactions send \
        --network=${this.network} \
        --signer ${signer} \
        ${configString} \
        -o json \
        --args-json ${argString} \
        ${path}`,
      { cwd: process.cwd() }
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

  async script(path, args) {
    const argString = formatArgString(args);
    const configString = formatConfigString(this.configs);

    const { stdout: out, stderr: err } = await exec(
      `flow scripts execute \
        --network=${this.network} \
        ${configString} \
        -o json \
        --args-json ${argString} \
        ${path}`,
      { cwd: process.cwd() }
    );

    if (err) {
      throw err;
    }

    const result = JSON.parse(out);

    return await decode(result);
  }
}

module.exports = FlowCliWrapper;
