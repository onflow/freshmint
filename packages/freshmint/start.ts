import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import { Ora } from 'ora';
import inquirer from 'inquirer';
import * as metadata from '@freshmint/core/metadata';

import { saveConfig, ContractConfig, ContractType, getDefaultDataPath, CollectionConfig } from './config';
import { generateProject } from './generateProject';

const fieldChoices = metadata.fieldTypes
  .filter((fieldType) => fieldType !== metadata.IPFSImage)
  .map((fieldType) => ({
    name: fieldType.label,
    value: fieldType.id,
  }));

const questions = [
  {
    type: 'input',
    name: 'name',
    message: 'Project name:',
    validate: async function (input: string) {
      if (!input) {
        return 'Please enter a name for your project.';
      }

      return true;
    },
  },
  {
    type: 'input',
    name: 'description',
    message: 'Project description:',
    default: (answers: any) => `This is the ${answers.name} project.`,
  },
  {
    type: 'input',
    name: 'contractName',
    message: 'Contract name: ',
    default: (answers: any) => suggestContractName(answers.name),
    validate: async function (input: string) {
      if (!input) {
        return 'Please enter a name for your contract.';
      }

      if (!isValidContractName(input)) {
        return 'A contract name can only include letters, numbers and underscores.';
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

  const collection: CollectionConfig = {
    name: answers.name,
    description: answers.description,
    url: 'https://your-project.com',
    images: {
      square: 'square.png',
      banner: 'banner.png',
    },
    socials: {
      twitter: 'http://twitter.com/your-project',
    },
  };

  const userFields = await getCustomFields(answers.startCustomFields);

  const userSchema = metadata.parseSchema(userFields);

  // Extend default schema with user fields
  const schema = metadata.defaultSchema.extend(userSchema);

  const contract: ContractConfig = {
    name: answers.contractName,
    type: answers.contractType,
    schema,
  };

  spinner.start('Generating project files...');

  await generateProject(
    projectPath,
    answers.name,
    answers.description,
    contract,
    getDefaultDataPath(contract.type),
    userSchema.fields,
  );

  saveConfig(collection, contract, '${PINNING_SERVICE_ENDPOINT}', '${PINNING_SERVICE_KEY}', projectPath);

  spinner.succeed(
    `✨ Project initialized in ${chalk.white(`${isCurrentDirectory ? 'the current directory.' : projectPath}\n`)}`,
  );

  if (!isCurrentDirectory) {
    ui.log.write(`Use: ${chalk.magentaBright(`cd ${projectPath}`)} to view your new project's files.\n`);
  }

  ui.log.write(`Open ${chalk.blueBright(`${projectPath}/README.md`)} to learn how to use your new project!`);
}

function isValidContractName(name: string): boolean {
  // A valid contract name only contains letters, numbers and underscores
  return /^[a-zA-Z0-9_]*$/.test(name);
}

function suggestContractName(name: string): string {
  return (
    name
      // Remove spaces from the contract name
      .replace(/\s*/g, '')
      // Convert dashes to underscores
      .replace(/-/g, '_')
  );
}
