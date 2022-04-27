#!/usr/bin/env node

// This file contains the main entry point for the command line `fresh` app, and the command line option parsing code.
// See fresh.js for the core functionality.

const path = require("path");
const { Command } = require("commander");
const inquirer = require("inquirer");
const chalk = require("chalk");
const ora = require("ora");
const ProgressBar = require("progress");
const Fresh = require("./fresh");
const carlton = require("./carlton");
const startCommand = require("./start");

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
      "-b, --batch-size <number>",
      "The number of NFTs to mint per batch",
      "10"
    )
    .option("-c, --claim", "Generate a claim key for each NFT")
    .option(
      "-n, --network <network>",
      "Network to mint to. Either 'emulator', 'testnet' or 'mainnet'",
      "emulator"
    )
    .action(mint);

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
  await startCommand(spinner)
}

async function deploy({ network }) {
  spinner.start(`Deploying project to ${network} ...`);
  const fresh = new Fresh(network);
  await fresh.deployContracts();
  spinner.succeed(`✨ Success! Project deployed to ${network} ✨`);
}

async function mint({ network, data, claim, batchSize }) {
  const fresh = new Fresh(network);

  const answer = await inquirer.prompt({
    type: "confirm",
    name: "confirm",
    message: `Create NFTs using data from ${path.basename(data)}?`
  });

  if (!answer.confirm) return;

  console.log();

  spinner.start("Checking for duplicate NFTs ...\n");

  let bar;

  await fresh.createNFTsFromCSVFile(
    data,
    claim,
    (total, skipped, batchCount, batchSize) => {
      if (skipped) {
        spinner.info(`Skipped ${skipped} NFTs because they already exist.\n`);
      } else {
        spinner.succeed()
      }

      if (total === 0) {
        return
      }

      console.log(`Minting ${total} NFTs in ${batchCount} batches (batchSize = ${batchSize})...\n`)

      bar = new ProgressBar(
        "[:bar] :current/:total :percent :etas", 
        { width: 40, total }
      );

      bar.tick(0);
    },
    (batchSize) => {
      bar.tick(batchSize)
    },
    (error) => {
      bar.interrupt(error.message)
    },
    Number(batchSize),
  );
}

async function startDrop(price, { network }) {
  spinner.start(`Creating drop ...`);
  const fresh = new Fresh(network);
  await fresh.startDrop(price);
  spinner.succeed(`✨ Success! Your drop is live. ✨`);
}

async function removeDrop({ network }) {
  spinner.start(`Removing drop ...`);
  const fresh = new Fresh(network);
  await fresh.removeDrop();
  spinner.succeed(`✨ Success! Drop removed. ✨`);
}

async function getNFT(tokenId, { network }) {
  spinner.start(`Getting NFT data ...`);

  const fresh = new Fresh(network);
  const { id, metadata } = await fresh.getNFTMetadata(tokenId);

  spinner.succeed(`✨ Success! NFT data retrieved. ✨`);

  const output = [
    ["Token ID:", chalk.green(id)],
    ["Name:", chalk.blue(metadata.name)],
    ["Description:", chalk.blue(metadata.description)],
    ["Image:", chalk.blue(metadata.image)]
  ];

  alignOutput(output);
}

async function dumpNFTs(csvPath) {
  const fresh = new Fresh();
  const count = await fresh.dumpNFTs(csvPath);
  
  spinner.succeed(`✨ Success! ${count} NFT records saved to ${csvPath}. ✨`);
}

async function pinNFTData(tokenId, { network }) {
  const fresh = new Fresh(network);

  await fresh.pinTokenData(
    tokenId,
    (fieldName) => spinner.start(`Pinning ${fieldName}...`),
    (fieldName) => spinner.succeed(`📌 ${fieldName} was pinned!`),
  );

  console.log(`🌿 Pinned all data for token ${chalk.green(tokenId)}`);
}

async function fundAccount(address, { network }) {
  spinner.start("Funding account  ...");
  const fresh = new Fresh(network);
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
