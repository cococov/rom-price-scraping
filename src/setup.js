'use strict';

const inquirer = require('inquirer');
const fs = require('fs').promises;

const setup = async () => {

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'itemName',
      message: 'Item name: ',
      validate: input => input !== ''
    },
    {
      type: 'number',
      name: 'maxResult',
      message: 'Max number of results [0 = all]: ',
      default: 0
    },
    {
      type: 'confirm',
      name: 'isNotificationActive',
      message: 'Do you wanna recive notifications?',
      default: false
    }
  ]);

  let answers2 = {};
  if (answers.isNotificationActive)
    answers2 = await inquirer.prompt([
      {
        type: 'number',
        name: 'priceNotification',
        message: 'Price to be notified: ',
        default: 0
      }
    ]);

  const finalAnswers = { ...answers, ...answers2 };

  let answersString = JSON.stringify(finalAnswers);
  console.log('\nLoading...');
  await fs.writeFile('settings.json', answersString);

  return finalAnswers;
}

module.exports = setup;