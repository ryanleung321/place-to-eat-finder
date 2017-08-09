'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const app = express();
const callbackToken = process.env.VERIFY_TOKEN || 'devToken';
const pageAccessToken = process.env.PAGE_ACCESS_TOKEN || "EAAEayvkpajwBAHbbWc3zieawFpIUHwYTIZBz0qQUwuUmhNXZALpULz6Gr4Ei5zqIqSZCy0IzbTKX8TXS0Maf9luMxl5Kt2dYeecs0MwRiabsEcrmZAhoxEfpZBB4EroxmKiEnQt5ZCIg32Ss0jNS7aHU0dI1a0X2SLGwOkvNQHnQZDZD";
const apiUrl = `https://graph.facebook.com/v2.6/me/messages?access_token=${pageAccessToken}`;
const sendTextMessage = require('./messageUtils').sendTextMessage;
const sendMessageCards = require('./messageUtils').sendMessageCards;
const sendGenericErrorMessage = require('./messageUtils').sendGenericErrorMessage;

app.set('port', (process.env.PORT || 5000));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}));

// parse application/json
app.use(bodyParser.json());

// index
app.get('/', function (req, res) {
	res.send("hello there");
});

// for facebook verification
app.get('/webhook', function (req, res) {
	if (req.query['hub.verify_token'] === callbackToken) {
		res.status(200).send(req.query['hub.challenge']);
	} else {
		res.status(400).send('Error, wrong token');
	}
});

// to post data
app.post('/webhook', function (req, res) {
  const messaging_events =
    (req.body.entry && req.body.entry.length && req.body.entry[0] && req.body.entry[0].messaging) ?
      req.body.entry[0].messaging : null;

  messaging_events && messaging_events.forEach((event) => {
    const sender = event && event.sender && event.sender.id;
    if (event.message && event.message.text) {
      let text = event.message.text;
      if (text.toLowerCase() === 'cards') {
        sendMessageCards(apiUrl, sender);
      } else {
        sendTextMessage(apiUrl, sender, "Text received, echo: " + text.substring(0, 200));
      }
    }
    if (event.postback) {
      let text = JSON.stringify(event.postback);
      sendTextMessage(apiUrl, sender, "Postback received: " + text.substring(0, 200));
    }
  });
  res.sendStatus(200);
});

app.listen(app.get('port'), function() {
	console.log('running on port', app.get('port'))
});
