'use strict';

const path = require('path');
const notifier = require('node-notifier');

/* Notification objects */
const timeToBuyNotification = (ItemName, price) => ({
  title: `Time to buy`,
  subtitle: `An item has a good price`,
  message: `The ${ItemName} was found priced at $ ${price}`,
  icon: path.join(__dirname, '../img/zeny.jpg'),
  sound: true,
  wait: true
});

const initNotification = () => ({
  title: `Buy notifications started`,
  message: `Here we go!`,
  icon: path.join(__dirname, '../img/zeny.jpg'),
  sound: true,
  wait: true
});

/* Notification Function*/
const sendNotification = (notification, callBack) => {
  notifier.notify(notification, callBack);
};

module.exports = {
  timeToBuyNotification,
  initNotification,
  sendNotification
}