#!/usr/bin/env node

// This file contains the main entry point for the command line `fresh` app, and the command line option parsing code.
// See fresh.js for the core functionality.

const path = require("path");
const { Command } = require("commander");
const inquirer = require("inquirer");
const chalk = require("chalk");
const colorize = require("json-colorizer");
const ora = require("ora");
const { MakeFresh } = require("./fresh");
const generateProject = require("./generate-project");
const generateWebAssets = require("./generate-web");
const { isExists } = require("./helpers");
const carlton = require("./carlton");

const colorizeOptions = {
  pretty: true,
  colors: {
    STRING_KEY: "blue.bold",
    STRING_LITERAL: "green"
  }
};

const program = new Command();
const spinner = ora();

async function main() {
  // commands

  program
    .command("start")
    .description("initialize a new project")
    .action(start);

  program
    .command("deploy")
    .description("deploy an instance of the FreshMint NFT contract")
    .option(
      "-n, --network <network>",
      "Network to deploy to. Either 'emulator', 'testnet' or 'mainnet'",
      "emulator"
    )
    .action(deploy);

  program
    .command("mint")
    .description("create multiple NFTs using data from a csv file")
    .option(
      "-d, --data <csv-path>",
      "The location of the csv file to use for minting",
      "nfts.csv"
    )
    .option(
      "-n, --network <network>",
      "Network to mint to. Either 'emulator', 'testnet' or 'mainnet'",
      "emulator"
    )
    .option("-c, --claim", "Generate a claim key for each NFT")
    .action(batchMintNFT);

  program
    .command("inspect <token-id>")
    .description("get info from Flow about an NFT using its token ID")
    .option(
      "-n, --network <network>",
      "Network to mint to. Either 'emulator', 'testnet' or 'mainnet'",
      "emulator"
    )
    .action(getNFT);

  program
    .command("dump <csv-path>")
    .description("dump all token metadata to a file")
    .action(dumpNFTs);

  program
    .command("start-drop <price>")
    .description("start a new NFT drop")
    .option(
      "-n, --network <network>",
      "Network to use. Either 'emulator', 'testnet' or 'mainnet'",
      "emulator"
    )
    .action(startDrop);

  program
    .command("remove-drop")
    .description("remove the current NFT drop")
    .option(
      "-n, --network <network>",
      "Network to use. Either 'emulator', 'testnet' or 'mainnet'",
      "emulator"
    )
    .action(removeDrop);

  program
    .command("pin <token-id>")
    .description('"pin" the data for an NFT to a remote IPFS Pinning Service')
    .option(
      "-n, --network <network>",
      "Network to mint to. Either 'emulator', 'testnet' or 'mainnet'",
      "emulator"
    )
    .action(pinNFTData);

  program
    .command("fund-account <address>")
    .description(
      "transfer some tokens to an emulator account. Only works when using the emulator & dev-wallet."
    )
    .option(
      "-n, --network <network>",
      "Network to mint to. Either 'emulator', 'testnet' or 'mainnet'",
      "emulator"
    )
    .action(fundAccount);

  program
    .command("prince")
    .description("in West Philadelphia born and raised...")
    .action(() => {
      console.log(carlton);
    });

  await program.parseAsync(process.argv);
}

// ---- command action functions

async function start() {
  const ui = new inquirer.ui.BottomBar();

  ui.log.write(chalk.greenBright("Initializing new project. 🍃\n"));

  const questions = [
    {
      type: "input",
      name: "projectName",
      message: "Name your new project:",
      validate: async function (input) {
        if (!input) {
          return "Please enter a name for your project.";
        }

        const exists = await isExists(input);

        if (exists) {
          return "A project with that name already exists.";
        }
        return true;
      }
    },
    {
      type: "input",
      name: "contractName",
      message: "Name the NFT contract (eg. MyNFT): ",
      validate: async function (input) {
        if (!input) {
          return "Please enter a name for your contract.";
        }

        return true;
      }
    }
  ];

  const answers = await inquirer.prompt(questions);

  spinner.start("Generating project files...");

  const formattedContractName = answers.contractName
    // Remove spaces from the contract name.
    .replace(/\s*/g, "")
    .trim()
    .split(" ")
    // Ensure title-case
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");

  await generateProject(answers.projectName, formattedContractName);
  await generateWebAssets(answers.projectName, formattedContractName);

  spinner.succeed(
    `✨ Project initialized in ${chalk.white(`./${answers.projectName}\n`)}`
  );

  ui.log.write(
    `Use: ${chalk.magentaBright(
      `cd ./${answers.projectName}`
    )} to view your new project's files.\n`
  );

  ui.log.write(
    `Open ${chalk.blueBright(
      `./${answers.projectName}/README.md`
    )} to learn how to use your new project!`
  );
}

async function deploy({ network }) {
  spinner.start(`Deploying project to ${network} ...`);
  const fresh = await MakeFresh(network);
  await fresh.deployContracts();
  spinner.succeed(`✨ Success! Project deployed to ${network} ✨`);
}

async function batchMintNFT({ network, data, claim }) {
  const fresh = await MakeFresh(network);

  const answer = await inquirer.prompt({
    type: "confirm",
    name: "confirm",
    message: `Create NFTs using data from ${path.basename(data)}?`
  });

  if (!answer.confirm) return;

  spinner.start("Minting your NFTs ...\n");

  const result = await fresh.createNFTsFromCSVFile(
    data,
    claim,
    (nft) => {
      if (nft.skipped) {
        spinner.warn(`Skipping NFT because it already exists.`);
        return;
      }

      if (nft.claimKey) {
        spinner.info(
          `Minted NFT ${nft.tokenId}. Claim key: ${chalk.blue(nft.claimKey)}`
        );
      } else {
        spinner.info(`Minted NFT ${nft.tokenId}`);
      }
    }
  );

  spinner.succeed(`✨ Success! ${result.total} NFTs were minted! ✨`);
}

async function startDrop(price, { network }) {
  spinner.start(`Creating drop ...`);
  const fresh = await MakeFresh(network);
  await fresh.startDrop(price);
  spinner.succeed(`✨ Success! Your drop is live. ✨`);
}

async function removeDrop({ network }) {
  spinner.start(`Removing drop ...`);
  const fresh = await MakeFresh(network);
  await fresh.removeDrop();
  spinner.succeed(`✨ Success! Drop removed. ✨`);
}

async function getNFT(tokenId, { network }) {
  spinner.start(`Getting NFT data ...`);
  const fresh = await MakeFresh(network);
  const nft = await fresh.getNFT(tokenId);

  const output = [
    ["Token ID:", chalk.green(nft.tokenId)],
    ["Owner Address:", chalk.yellow(nft.ownerAddress)],
    ["Metadata Address:", chalk.blue(nft.metadataURI)],
    ["Metadata Gateway URL:", chalk.blue(nft.metadataGatewayURL)]
  ];

  alignOutput(output);

  console.log("NFT Metadata:");
  console.log(colorize(JSON.stringify(nft.metadata), colorizeOptions));
  spinner.succeed(`✨ Success! NFT data retrieved. ✨`);
}

async function dumpNFTs(csvPath) {
  const fresh = await MakeFresh();
  const count = await fresh.dumpNFTs(csvPath);
  
  spinner.succeed(`✨ Success! ${count} NFT records saved to ${csvPath}. ✨`);
}

async function pinNFTData(tokenId, { network }) {
  const fresh = await MakeFresh(network);
  await fresh.pinTokenData(tokenId);
  console.log(`🌿 Pinned all data for token id ${chalk.green(tokenId)}`);
}

async function fundAccount(address, { network }) {
  spinner.start("Funding account  ...");
  const fresh = await MakeFresh(network);
  const result = await fresh.fundAccount(address);
  spinner.succeed(
    `💰 ${result} FLOW tokens transferred to ${chalk.green(address)}`
  );
}

// ---- helpers

// Unused but could come in handy later.
//
// async function promptForMissing(cliOptions, prompts) {
//   const questions = [];
//   for (const [name, prompt] of Object.entries(prompts)) {
//     prompt.name = name;
//     prompt.when = (answers) => {
//       if (cliOptions[name]) {
//         answers[name] = cliOptions[name];
//         return false;
//       }
//       return true;
//     };
//     questions.push(prompt);
//   }
//   return inquirer.prompt(questions);
// }

function alignOutput(labelValuePairs) {
  const maxLabelLength = labelValuePairs
    .map(([l, _]) => l.length)
    .reduce((len, max) => (len > max ? len : max));
  for (const [label, value] of labelValuePairs) {
    console.log(label.padEnd(maxLabelLength + 1), value);
  }
}

// ---- main entry point when running as a script

// make sure we catch all errors
main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
