import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import { Ora } from 'ora';
import inquirer from 'inquirer';
import { Config, ContractType } from './config';
import { metadata } from '../lib';
import { generateProject } from './generateProject';

const fieldChoices = metadata.fieldTypes.map((fieldType) => ({
  name: fieldType.label,
  value: fieldType.id,
}));

const questions = [
  {
    type: 'input',
    name: 'contractName',
    message: 'Contract name (eg. MyNFT): ',
    validate: async function (input: string) {
      if (!input) {
        return 'Please enter a name for your contract.';
      }

      return true;
    },
  },
  {
    type: 'list',
    name: 'contractType',
    message: 'Contract type:',
    choices: [
      {
        name: 'Standard NFT',
        value: ContractType.Standard,
      },
      {
        name: 'Edition NFT',
        value: ContractType.Edition,
      },
    ],
  },
  {
    type: 'confirm',
    name: 'startCustomFields',
    message: 'Would you like to define custom NFT fields?',
  },
];

function customFieldQuestions(count: number) {
  return [
    {
      type: 'input',
      name: 'name',
      message: `Field ${count} name:`,
      validate: async function (input: string) {
        if (input !== input.toLowerCase()) {
          return 'Fields must be lowercase.';
        }

        return true;
      },
    },
    {
      type: 'list',
      name: 'type',
      message: `Field ${count} type:`,
      choices: fieldChoices,
    },
    {
      type: 'confirm',
      name: 'continue',
      message: 'Would you like to define another custom field?',
    },
  ];
}

async function getCustomFields(shouldStart: boolean) {
  const fields: { name: string; type: string }[] = [];

  let shouldContinue = shouldStart;

  while (shouldContinue) {
    const count: number = fields.length + 1;
    const field = await inquirer.prompt(customFieldQuestions(count));

    fields.push({ name: field.name, type: field.type });

    shouldContinue = field.continue;
  }

  return fields;
}

export default async function start(spinner: Ora, projectPath: string) {
  const isCurrentDirectory = projectPath === '.';

  const projectExists = await fs.pathExists(path.resolve(projectPath, 'freshmint.yaml'));
  if (projectExists) {
    throw `A project already exists in ${isCurrentDirectory ? 'the current directory' : 'that directory'}.`;
  }

  const ui = new inquirer.ui.BottomBar();

  ui.log.write(
    `${chalk.greenBright('Initializing a new project in')} ${
      isCurrentDirectory ? chalk.greenBright('the current directory.') : chalk.white(projectPath)
    } 🍃\n\n`,
  );

  const answers = await inquirer.prompt(questions);

  const userFields = await getCustomFields(answers.startCustomFields);

  const userSchema = metadata.parseSchema(userFields);

  // Extend default schema with user fields
  const schema = metadata.defaultSchema.extend(userSchema);

  const config = new Config({
    contract: {
      name: sanitizeContractName(answers.contractName),
      type: answers.contractType,
      schema,
    },
    ipfsPinningService: {
      endpoint: '${PINNING_SERVICE_ENDPOINT}',
      key: '${PINNING_SERVICE_KEY}',
    },
  });

  spinner.start('Generating project files...');

  await generateProject(projectPath, config);

  spinner.succeed(
    `✨ Project initialized in ${chalk.white(`${isCurrentDirectory ? 'the current directory.' : projectPath}\n`)}`,
  );

  if (!isCurrentDirectory) {
    ui.log.write(`Use: ${chalk.magentaBright(`cd ${projectPath}`)} to view your new project's files.\n`);
  }

  ui.log.write(`Open ${chalk.blueBright(`${projectPath}/README.md`)} to learn how to use your new project!`);
}

function sanitizeContractName(name: string): string {
  return (
    name
      // Remove spaces from the contract name.
      .replace(/\s*/g, '')
      .trim()
      .split(' ')
      // Ensure title-case
      .map((word: string) => word[0].toUpperCase() + word.slice(1))
      .join(' ')
  );
}
