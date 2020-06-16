const fetch = require('node-fetch');
const readline = require('readline');

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


var pastPrice = 0;
var isFirstTime = true;
/**
 * Loop.
 * Clean the console.
 * Print the last data of the item in console.
 * Checks if the item has a desable price and send a windows notification.
 */
const cycle = async () => {
  let lastPrice = await requestLastPrice(395);
  let date = getDate();
  let price = formatNumber(lastPrice.price);
  let stock = formatNumber(lastPrice.stock);

  let isFavorable = (lastPrice.price < pastPrice);
  let diference = Math.abs(pastPrice - lastPrice.price);
  let isEqual = (lastPrice.price === pastPrice);
  pastPrice = lastPrice.price;

  let favorable = `${isEqual ? '' :
    `${isFavorable ?
      `\x1b[32m--${diference}` :
      `\x1b[31m++${diference}`}\x1b[0m`}`;

  console.clear();
  console.log(`Date: ${date}`);
  console.log(`Price: $ ${price} ${isFirstTime ? '' : favorable}`);
  console.log(`Stock: ${stock}`);

  if (lastPrice.snapEnd !== 0) {
    let snapBuyers = formatNumber(lastPrice.snapBuyers)
    let snapEnd = lastPrice.snapEnd

    console.log(`\nItem in SNAP`);
    console.log(`Snap Buyers: ${snapBuyers}`);
    console.log(`Snap End: ${snapEnd}`);
  }

  console.log(`\nRefresh Time: ${refreshTime / 1000}[s]`);
  console.log(`Exit: 'ctrl + q'`);

  isFirstTime = false;
  setTimeout(() => {
    cycle();
  }, refreshTime);
};

/* _INIT_ */
const init = async () => {
  await cycle();
};

// start
init();

/* key press listener for shortcuts */
readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

process.stdin.on('keypress', (str, key) => {
  if (key.ctrl && key.name === 'q')
    process.exit();
});