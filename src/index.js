'use strict';

const fetch = require('node-fetch');
const readline = require('readline');
const setup = require('./setup');
const {
  initNotification,
  timeToBuyNotification,
  sendNotification
} = require('./notifications');

var settings = {};
var refreshTime = 60 * 1000; // [ms]

/**
 * hh:mm
 */
const getDate = () => {
  let date = new Date();
  let formatDate = `${date.getDay()}-${date.getMonth()}-${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}`
    .replace(/(\d+)-(\d+)-(\d+) (\d+):(\d+)/,
      (str, DD, MM, YYYY, hh, mm) =>
        `${(DD < 10) ? '0' : ''}${DD}-${(MM < 10) ? '0' : ''}${MM}-${YYYY} ${(hh < 10) ? '0' : ''}${hh}:${(mm < 10) ? '0' : ''}${mm}`
    );

  return formatDate;
};

/**
 * 100.000.000
 * @param {Number} price - the price as a integer
 */
const formatNumber = price => {
  let fPrice = `${price}`
    .replace(/(\d)(?=(\d{3})+(?!\d))/g, `$1.`);

  return fPrice;
};

/**
 * Return the data of the looking Item
 * @param {Number} id - Item ID
 * @returns {Object}
 * {
 *   timestamp: 1592268113,
 *   price: 155412,
 *   stock: 2954,
 *   snapBuyers: 0,
 *   snapEnd: 0
 * }
 */
const requestLastPrice = async id => {
  let result = await fetch(`https://poring.world/api/history?id=${id}&type=recent`);
  let response = await result.text();
  let body = JSON.parse(response);

  return body[0];
};

/**
 * Return an array with objects the result items
 * @param {String} name - the name or part of the name of the item
 * @returns {Object}
 * [
 *   {
 *       "id": 395,
 *       "itemId": 52515,
 *       "icon": "item_52515",
 *       "name": "Super Boost",
 *       "category": "Item - Material",
 *       "description": "An auxiliary agent with a greatly enhanced effect. It must be used in combination with another drug.",
 *       "blueprintProductPrice": 0,
 *       "blueprintCraftingFee": 0,
 *       "refineLv": 0,
 *       "safeRefineCost": 0,
 *       "rarity": 3,
 *       "modified": false,
 *       "inStock": true,
 *       "priceChange1d": -0.9456858314503306,
 *       "priceChange3d": -6.929986390443067,
 *       "priceChange7d": -3.52740541963961,
 *       "lastRecord": {
 *           "timestamp": 1592320019,
 *           "price": 153868,
 *           "stock": 3433,
 *           "snapBuyers": 0,
 *           "snapEnd": 0
 *       }
 *   }
 * ]
 */
const requestItemByName = async name => {
  let result = await fetch(`https://poring.world/api/search?order=popularity&rarity=&inStock=1&modified=&category=&endCategory=&q=${name}`);
  let response = await result.text();
  let body = JSON.parse(response);

  return body;
};

// Last item price for comparation purpuses
var pastPrice = {};
// to check if is the first time running the script
var isFirstTime = true;

/**
 * Print the item Info
 * @param {Object} item - Item data
 */
const printItem = item => {
  let lastPrice = item.lastRecord;
  let name = item.name;
  let price = formatNumber(lastPrice.price);
  let stock = formatNumber(lastPrice.stock);

  let isFavorable = (lastPrice.price < pastPrice[item.id]);
  let diference = Math.abs(pastPrice[item.id] - lastPrice.price);
  let isEqual = (lastPrice.price === pastPrice[item.id]);

  pastPrice[item.id] = lastPrice.price;

  let favorable = `${isEqual ? '' :
    `${isFavorable ?
      `\x1b[32m--${diference}` :
      `\x1b[31m++${diference}`}\x1b[0m`}`;

  console.log(`Name: ${name}`);
  console.log(`Price: $ ${price} ${isFirstTime ? '' : favorable}`);
  console.log(`Stock: ${stock}`);

  if (lastPrice.snapEnd !== 0) {
    let snapBuyers = formatNumber(lastPrice.snapBuyers)
    let snapEnd = lastPrice.snapEnd

    console.log(`\nItem in \x1b[31mSNAP\x1b[0m`);
    console.log(`Snap Buyers: ${snapBuyers}`);
    console.log(`Snap End: ${snapEnd}`);
  }

  console.log('------------');

  if (lastPrice.price < settings.priceNotification)
    sendNotification(timeToBuyNotification(name, price));
};

/**
 * Loop.
 * Clean the console.
 * Print the last data of the item in console.
 * Checks if the item has a desable price and send a windows notification.
 */
const cycle = async () => {
  const { itemName, maxResult } = settings;
  let itemList = await requestItemByName(itemName);
  let date = getDate();

  console.clear();
  console.log(`\nDate: ${date}`);
  console.log('------------');

  if (maxResult === 0) {
    itemList.forEach(item => printItem(item));
  } else {
    for (let i = 0; i < maxResult; i++) {
      printItem(itemList[i]);
    }
  }


  console.log(`\nRefresh Time: ${refreshTime / 1000}[s]`);
  console.log(`Exit: 'ctrl + q'`);

  isFirstTime = false;
  setTimeout(() => {
    cycle();
  }, refreshTime);
};

/* Key listener for exit and suff */
const keyListener = async () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
  });

  readline.emitKeypressEvents(process.stdin, rl);

  process.stdin.setRawMode(true);

  process.stdin.on('keypress', (str, key) => {
    if (key.ctrl && key.name === 'q')
      process.exit();
  });
};

/* _INIT_ */
const init = async () => {
  console.clear();
  console.log('\n');
  settings = await setup();

  if (settings.isNotificationActive)
    sendNotification(initNotification());

  keyListener();

  await cycle();
};

// start
init();

// TODO: add last price before close to a json file for future comparations