import * as fs from 'fs-extra';
import * as path from 'path';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import * as metadata from '@freshmint/core/metadata';

import { ContractConfig, ContractType, getDefaultDataPath } from '../config';
import { generateProject } from '../generate';

export default new Command('start').argument('<project-path>').description('create a new project').action(start);

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
    message: 'Contract name:',
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

async function start(projectPath: string) {
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

  const schema = metadata.defaultSchema;

  const contract: ContractConfig = {
    name: answers.contractName,
    type: answers.contractType,
    schema,
  };

  const spinner = ora();

  spinner.start('Generating project files...');

  const description = `This is the ${answers.name} project.`;

  await generateProject(projectPath, answers.name, description, contract, getDefaultDataPath(contract.type));

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
