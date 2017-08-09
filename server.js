'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const sendTextMessage = require('./messageUtils').sendTextMessage;
const sendMessageCards = require('./messageUtils').sendMessageCards;
const sendGenericErrorMessage = require('./messageUtils').sendGenericErrorMessage;
const sendLocationRequestMessage = require('./messageUtils').sendLocationRequestMessage;
const CALLBACK_TOKEN = process.env.VERIFY_TOKEN || 'devToken';
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || 'EAAEayvkpajwBAHbbWc3zieawFpIUHwYTIZBz0qQUwuUmhNXZALpULz6Gr4Ei5zqIqSZCy0IzbTKX8TXS0Maf9luMxl5Kt2dYeecs0MwRiabsEcrmZAhoxEfpZBB4EroxmKiEnQt5ZCIg32Ss0jNS7aHU0dI1a0X2SLGwOkvNQHnQZDZD';
const API_URL = `https://graph.facebook.com/v2.6/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;
const GET_STARTED_PAYLOAD = 'GET_STARTED_PAYLOAD';
const LOCATION_ATTACHMENT_TYPE = 'location';
const YELP_API_URL = (lat, long) => `https://api.yelp.com/v2/search?term=food&ll=${lat},${long}`;

const app = express();
app.set('port', (process.env.PORT || 5000));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}));

// parse application/json
app.use(bodyParser.json());

// index
app.get('/', function (req, res) {
	res.send('hello there');
});

// for facebook verification
app.get('/webhook', function (req, res) {
	if (req.query['hub.verify_token'] === CALLBACK_TOKEN) {
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
        sendMessageCards(API_URL, sender);
      } else if (text.toLowerCase() === 'help') {
        sendLocationRequestMessage(API_URL, sender);
      } else{
        sendTextMessage(API_URL, sender, 'Text received, echo: ' + text.substring(0, 200));
      }
    }
    if (event.postback) {
      const postbackPayload = event.postback.payload;
      if (postbackPayload === GET_STARTED_PAYLOAD) {
        sendTextMessage(API_URL, sender, 'Sure thing!').then(() => {
          sendLocationRequestMessage(API_URL, sender);
        });
      }
    }
    if (event.message && event.message.attachments) {
      const locations = event.message.attachments.length ?
        event.message.attachments.filter((attachment) => {
          return attachment.type === LOCATION_ATTACHMENT_TYPE;
        }) : [];

      if (locations.length) {
        const userLocation = locations[0] && locations[0].payload && locations[0].payload.coordinates;
        const lat = userLocation.lat;
        const long = userLocation.long;

        fetch(YELP_API_URL(lat, long),  {
          method: 'GET'
        }).then((resp) => {
          return resp.json();
        }).then((resp) => {
          console.log('$$$$$$$$$$$', JSON.stringify(resp));
        })
      }
    }
  });
  res.sendStatus(200);
});

app.listen(app.get('port'), function() {
	console.log('running on port', app.get('port'))
});
