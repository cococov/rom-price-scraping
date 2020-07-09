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
var refreshTime = 10 * 60 * 1000; // [ms]
var timeOutReference = null;

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
 * Returns final price difference of the item
 * @param {Number} id - Item ID
 * @returns {int} difference
 * fetch result:
 * {
 *   timestamp: 1592268113,
 *   price: 155412,
 *   stock: 2954,
 *   snapBuyers: 0,
 *   snapEnd: 0
 * }
 */
const getDiff = async id => {
  let body = [];

  try {
    let result = await fetch(`https://poring.world/api/history?id=${id}&type=recent`);
    let response = await result.text();
    body = JSON.parse(response);

  } catch (err) {
    return 0;
  }

  return (body[0].price - body[1].price);
};

/**
 * Returns the last price difference of the item (only run the first time)
 * @param {Number} id - Item ID
 * @returns {int} difference
 * fetch result:
 * {
 *   timestamp: 1592268113,
 *   price: 155412,
 *   stock: 2954,
 *   snapBuyers: 0,
 *   snapEnd: 0
 * }
 */
const getFirstDiff = async id => {
  let body = [];

  try {
    let result = await fetch(`https://poring.world/api/history?id=${id}&type=recent`);
    let response = await result.text();
    body = JSON.parse(response);

  } catch (err) {
    return 0;
  }

  // checks the last different price and compare it to the last price
  let lastPrice = body[0].price;
  let priceToCompare = body[1].price;
  for (let key in body) {
    let item = body[key];
    if ((lastPrice - item.price) !== 0) {
      priceToCompare = item.price;
      break;
    }
  }

  let difference = lastPrice - priceToCompare;
  return difference;
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
  let body;

  try {
    let params = new URLSearchParams({
      order: 'popularity',
      rarity: '',
      inStock: 1,
      modified: '',
      category: '',
      endCategory: '',
      q: name
    });
    let result = await fetch(`https://poring.world/api/search?${params.toString()}`);
    let response = await result.text();
    body = JSON.parse(response);
  } catch (err) {
    body = [{
      id: -1,
      name: "REQUEST_ERROR",
      lastRecord: {
        timestamp: 0,
        price: 0,
        stock: 0,
        snapBuyers: 0,
        snapEnd: 0
      }
    }];
  }

  return body;
};

var isFirstTime = true;
var isFalling = true;

/**
 * Print the item Info
 * @param {Object} item - Item data
 */
const printItem = async item => {
  let id = item.id;
  let lastPrice = item.lastRecord;
  let name = item.name;
  let price = formatNumber(lastPrice.price);
  let stock = formatNumber(lastPrice.stock);

  let differenceWithSymbol = isFirstTime
    ? await getFirstDiff(id)
    : await getDiff(id);
  let difference = Math.abs(differenceWithSymbol);
  let isEqual = (differenceWithSymbol === 0);

  if (!isEqual)
    isFalling = (differenceWithSymbol < 0);

  let favorable = `${isEqual
    ? `${isFalling
      ? `\x1b[32m--`
      : `\x1b[31m++`}`
    : `${isFalling
      ? `\x1b[32m--${difference}`
      : `\x1b[31m++${difference}`}`}\x1b[0m`;

  console.log(`Name: ${name}`);
  console.log(`Price: $ ${price} ${favorable}`);
  console.log(`Stock: ${stock}`);

  if (lastPrice.snapEnd !== 0) {
    let snapBuyers = formatNumber(lastPrice.snapBuyers);
    let snapEnd = lastPrice.snapEnd;

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
 * Checks if the item has a desirable price and send a windows notification.
 */
const cycle = async () => {
  const { itemName, maxResult } = settings;
  let itemList = await requestItemByName(itemName);
  let date = getDate();

  console.clear();
  console.log(`\nDate: ${date}`);
  console.log('------------');

  if (maxResult === 0) {
    await Promise.all(
      itemList.map(async item => { await printItem(item) })
    );
  } else {
    for (let i = 0; i < maxResult; i++) {
      await printItem(itemList[i]);
    }
  }


  console.log(`\nRefresh Time: ${refreshTime / 1000}[s]`);
  console.log(`Setup: 'ctrl + s'`);
  console.log(`Exit: 'ctrl + q'`);

  isFirstTime = false;
  timeOutReference = setTimeout(() => {
    cycle();
  }, refreshTime);
};

/* Key listener for exit and stuff */
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
    if (key.ctrl && key.name === 's')
      runSetup();
  });
};

const runSetup = async () => {
  clearTimeout(timeOutReference);
  init();
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

// TODO: add last price before close to a json file for future comparisons