'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const GET_STARTED_PAYLOAD = 'GET_STARTED_PAYLOAD';
const LOCATION_ATTACHMENT_TYPE = 'location';

// FB CONSTANTS
const CALLBACK_TOKEN = process.env.FB_VERIFY_TOKEN || require('../devConstants').FB_VERIFY_TOKEN;

const {
  handleLocationMessage,
  handlePostbackMessage,
  handleTextMessage,
} = require('./messageHandlers');

const app = express();
app.set('port', (process.env.PORT || 5000));

// Parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}));

// Parse application/json
app.use(bodyParser.json());

app.get('/', function (req, res) {
	res.send('hello there');
});

// For facebook verification
app.get('/webhook', function (req, res) {
	if (req.query['hub.verify_token'] === CALLBACK_TOKEN) {
		res.status(200).send(req.query['hub.challenge']);
	} else {
		res.status(400).send('Error, wrong token');
	}
});

app.post('/webhook', function (req, res) {
  const messaging_events =
    (req.body.entry && req.body.entry.length && req.body.entry[0] && req.body.entry[0].messaging) ?
      req.body.entry[0].messaging : null;

  messaging_events && messaging_events.forEach((event) => {
    const sender = event && event.sender && event.sender.id;

    // Handle text messages
    if (event.message && event.message.text) {
      handleTextMessage(sender, event.message.text);
    }

    // Handle a postback (button click)
    if (event.postback) {
      handlePostbackMessage(sender, event.postback.payload);
    }

    // Handle a location message
    if (event.message && event.message.attachments) {
      const locations = event.message.attachments.length ?
        event.message.attachments.filter((attachment) => {
          return attachment.type === LOCATION_ATTACHMENT_TYPE;
        }) : [];

      handleLocationMessage(sender, locations);
    }
  });
  res.sendStatus(200);
});

app.listen(app.get('port'), function() {
	console.log('running on port', app.get('port'))
});
