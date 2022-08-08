import chalk from 'chalk';
import { Ora } from 'ora';
import inquirer from 'inquirer';
import * as fs from 'fs-extra';
import generateProject from './generate-project';
import { metadata } from '../lib';

const fieldChoices = metadata.fieldTypes.map((fieldType) => ({
  name: fieldType.label,
  value: fieldType,
}));

const questions = [
  {
    type: 'input',
    name: 'projectName',
    message: 'Name your new project:',
    validate: async function (input: string) {
      if (!input) {
        return 'Please enter a name for your project.';
      }

      const exists = await fs.pathExists(input);
      if (exists) {
        return 'A project with that name already exists.';
      }

      return true;
    },
  },
  {
    type: 'input',
    name: 'contractName',
    message: 'Name the NFT contract (eg. MyNFT): ',
    validate: async function (input: string) {
      if (!input) {
        return 'Please enter a name for your contract.';
      }

      return true;
    },
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
      message: `Custom field ${count} name:`,
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
      message: `Custom field ${count} type:`,
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

export default async function start(spinner: Ora) {
  const ui = new inquirer.ui.BottomBar();

  ui.log.write(chalk.greenBright('Initializing new project. 🍃\n'));

  const answers = await inquirer.prompt(questions);

  const userFields = await getCustomFields(answers.startCustomFields);
  const userSchema = metadata.parseSchema(userFields);

  // Extend default schema with user fields
  const schema = metadata.defaultSchema.extend(userSchema);

  spinner.start('Generating project files...');

  const formattedContractName = answers.contractName
    // Remove spaces from the contract name.
    .replace(/\s*/g, '')
    .trim()
    .split(' ')
    // Ensure title-case
    .map((word: string) => word[0].toUpperCase() + word.slice(1))
    .join(' ');

  await generateProject(answers.projectName, formattedContractName, schema);

  spinner.succeed(`✨ Project initialized in ${chalk.white(`./${answers.projectName}\n`)}`);

  ui.log.write(`Use: ${chalk.magentaBright(`cd ./${answers.projectName}`)} to view your new project's files.\n`);

  ui.log.write(`Open ${chalk.blueBright(`./${answers.projectName}/README.md`)} to learn how to use your new project!`);
}
