'use strict';

const fetch = require('node-fetch');

const sendTextMessage = (apiUrl, sender, text) => {
  let messageData = { text:text };

  const requestBody = JSON.stringify({
    recipient: {
      id: sender
    },
    message: messageData
  });

  return fetch(apiUrl, {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    method: 'POST',
    body: requestBody
  }).then((resp) => {
    return resp.json();
  }).then((resp) => {
    console.log(resp);
    return resp;
  });
};

const sendBusinessCards = (apiUrl, sender, restaurants) => {
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

  return fetch(apiUrl, {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    method: 'POST',
    body: requestBody
  }).then((resp) => {
    return resp.json();
  }).then((resp) => {
    console.log(resp);
    return resp;
  });
};

const sendGenericErrorMessage = (apiUrl, sender) => {
  sendTextMessage(apiUrl, sender, "An error occured! Sorry for the inconvenience.");
};

const sendLocationRequestMessage = (apiUrl, sender) => {
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

  return fetch(apiUrl, {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    method: 'POST',
    body: requestBody
  }).then((resp) => {
    return resp.json();
  }).then((resp) => {
    console.log(resp);
    return resp;
  });
};

module.exports = {
  sendTextMessage,
  sendBusinessCards,
  sendGenericErrorMessage,
  sendLocationRequestMessage,
};
