import chalk from "chalk";
import generateProject from "./generate-project";
import generateWebAssets from "./generate-web";
import { isExists } from "./helpers";
import { Field, fieldTypes } from "./metadata/fields";
import Metadata from "./metadata";
import { Ora } from "ora";

const inquirer = require("inquirer");

const fieldChoices = fieldTypes.map(fieldType => ({
  name: fieldType.label,
  value: fieldType
}))

const questions = [
  {
    type: "input",
    name: "projectName",
    message: "Name your new project:",
    validate: async function (input: string) {
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
    validate: async function (input: string) {
      if (!input) {
        return "Please enter a name for your contract.";
      }

      return true;
    }
  },
  {
    type: "list",
    name: "onChainMetadata",
    message: "Metadata format:",
    choices: ["on-chain", "off-chain"],
    filter: (input: string) => input === "on-chain"
  },
  {
    type: "confirm",
    name: "startCustomFields",
    when: (answers: any) => answers.onChainMetadata,
    message: "Would you like to define custom NFT fields?"
  }
]

function customFieldQuestions(count: number) {
  return [
    {
      type: "input",
      name: "name",
      message: `Custom field ${count} name:`,
      validate: async function (input: string) {
        if (input !== input.toLowerCase()) {
          return "Fields must be lowercase."
        }

        return true;
      }
    },
    {
      type: "list",
      name: "type",
      message: `Custom field ${count} type:`,
      choices: fieldChoices
    },
    {
      type: "confirm",
      name: "continue",
      message: "Would you like to define another custom field?"
    }
  ]
}

async function getCustomFields(shouldStart: boolean) {

  const customFields = []

  let shouldContinue = shouldStart

  while (shouldContinue) {
    const count: number = customFields.length + 1
    const customField = await inquirer.prompt(
      customFieldQuestions(count)
    )

    const field = new Field(customField.name, customField.type)

    customFields.push(field)

    shouldContinue = customField.continue
  }
  
  return customFields
}

export default async function start(spinner: Ora) {
  const ui = new inquirer.ui.BottomBar();

  ui.log.write(chalk.greenBright("Initializing new project. 🍃\n"));
  
  const answers = await inquirer.prompt(questions);

  const customFields = await getCustomFields(answers.startCustomFields)

  const fields = Metadata.getDefaultFields(answers.onChainMetadata, customFields)

  spinner.start("Generating project files...");

  const formattedContractName = answers.contractName
    // Remove spaces from the contract name.
    .replace(/\s*/g, "")
    .trim()
    .split(" ")
    // Ensure title-case
    .map((word: string) => word[0].toUpperCase() + word.slice(1))
    .join(" ");

  await generateProject(
    answers.projectName,
    formattedContractName,
    answers.onChainMetadata,
    fields
  );

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

module.exports = start
