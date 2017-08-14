'use strict';

const network = require('./network');
const SHOW_MORE_PAYLOAD = 'SHOW_MORE';

// devConstants folder that should contain your own api keys
const devConstants = require('../devConstants');

const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN || devConstants.FB_PAGE_ACCESS_TOKEN;
const MESSENGER_API_URL = `https://graph.facebook.com/v2.6/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;

const sendTextMessage = (sender, text) => {
  let messageData = { text: text };

  const requestBody = JSON.stringify({
    recipient: {
      id: sender
    },
    message: messageData
  });

  const config = {
    url: MESSENGER_API_URL,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    method: 'POST',
    data: requestBody
  };

  return network.call(config).then((resp) => {
    console.log(resp.data);
    return resp;
  }, (err) => {
    console.log(err);
  });
};

const sendBusinessCards = (sender, restaurants) => {
  let messageData = {
    "attachment": {
      "type": "template",
      "payload": {
        "template_type": "generic",
        "elements": restaurants
      }
    }
  };

  const requestBody = JSON.stringify({
    recipient: {
      id: sender
    },
    message: messageData
  });

  const config = {
    url: MESSENGER_API_URL,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    method: 'POST',
    data: requestBody
  };

  return network.call(config).then((resp) => {
    console.log(resp.data);
    return resp;
  }, (err) => {
    console.log(err);
  });
};

const sendGenericErrorMessage = (sender) => {
  sendTextMessage(sender, "Sorry, I'm not quite sure what to make of that...");
};

const sendLocationRequestMessage = (sender) => {
  const requestBody = JSON.stringify({
    recipient: {
      id: sender
    },
    message: {
      text: "Just send your location and we'll find you places to eat nearby!",
      quick_replies: [
        {
          content_type: "location"
        }
      ]
    }
  });

  const config = {
    url: MESSENGER_API_URL,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    method: 'POST',
    data: requestBody
  };

  return network.call(config).then((resp) => {
    console.log(resp.data);
    return resp;
  }, (err) => {
    console.log(err);
  });
};

const appendShowMoreCard = (cardData, imageUrl) => {
  cardData.push({
    "title": 'More Businesses',
    "subtitle": 'Show the next 3 businesses',
    "image_url": imageUrl,
    "default_action": {
      "type": "web_url",
      "url": 'https://www.yelp.com'
    },
    "buttons": [{
      "type": "postback",
      "payload": SHOW_MORE_PAYLOAD,
      "title": "Show More"
    }],
  });

  return cardData;
};

module.exports = {
  appendShowMoreCard,
  sendTextMessage,
  sendBusinessCards,
  sendGenericErrorMessage,
  sendLocationRequestMessage,
};
