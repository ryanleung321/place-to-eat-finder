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

const sendMessageCards = (apiUrl, sender) => {
  let messageData = {
    "attachment": {
      "type": "template",
      "payload": {
        "template_type": "generic",
        "elements": [{
          "title": "First card",
          "subtitle": "Element #1 of an hscroll",
          "image_url": "http://messengerdemo.parseapp.com/img/rift.png",
          "buttons": [{
            "type": "web_url",
            "url": "https://www.messenger.com",
            "title": "web url"
          }, {
            "type": "postback",
            "title": "Postback",
            "payload": "Payload for first element in a generic bubble",
          }],
        }, {
          "title": "Second card",
          "subtitle": "Element #2 of an hscroll",
          "image_url": "http://messengerdemo.parseapp.com/img/gearvr.png",
          "buttons": [{
            "type": "postback",
            "title": "Postback",
            "payload": "Payload for second element in a generic bubble",
          }],
        }]
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
  sendMessageCards,
  sendGenericErrorMessage,
  sendLocationRequestMessage,
};
