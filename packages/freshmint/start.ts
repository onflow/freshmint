import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import { Ora } from 'ora';
import inquirer from 'inquirer';
import * as metadata from '@freshmint/core/metadata';

import { ContractConfig, ContractType, getDefaultDataPath } from './config';
import { generateProject } from './generateProject';

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
    name: 'contractName',
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
];

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

  saveConfig(
    answers.name,
    answers.description,
    contract,
    '${PINNING_SERVICE_ENDPOINT}',
    '${PINNING_SERVICE_KEY}',
    projectPath,
  );

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
