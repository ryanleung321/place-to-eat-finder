'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const NodeCache = require('node-cache');
const GET_STARTED_PAYLOAD = 'GET_STARTED_PAYLOAD';
const SHOW_MORE_PAYLOAD = 'SHOW_MORE';
const LOCATION_ATTACHMENT_TYPE = 'location';

// FB CONSTANTS
const CALLBACK_TOKEN = process.env.FB_VERIFY_TOKEN || require('./devConstants').FB_VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN || require('./devConstants').FB_PAGE_ACCESS_TOKEN;
const MESSENGER_API_URL = `https://graph.facebook.com/v2.6/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;

// YELP CONSTANTS
const YELP_CLIENT_ID = process.env.YELP_CLIENT_ID || require('./devConstants').YELP_CLIENT_ID;
const YELP_CLIENT_SECRET = process.env.YELP_CLIENT_SECRET || require('./devConstants').YELP_CLIENT_SECRET;
const YELP_API_URL = 'https://api.yelp.com/v3/businesses/search';
const YELP_AUTH_API = 'https://api.yelp.com/oauth2/token';
const YELP_AUTH_GRANT_TYPE = 'client_credentials';

// YELP TOKEN CACHE
const yelpCache = new NodeCache();
const userCache = new NodeCache();

// HELPER METHODS
const sendTextMessage = require('./messageUtils').sendTextMessage;
const sendBusinessCards = require('./messageUtils').sendBusinessCards;
const sendGenericErrorMessage = require('./messageUtils').sendGenericErrorMessage;
const sendLocationRequestMessage = require('./messageUtils').sendLocationRequestMessage;
const getYelpLLSearchResults = require('./apiHelpers/yelpHelpers').getYelpLLSearchResults;
const businessResolver = require('./dataResolvers').businessResolver;

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
        sendBusinessCards(MESSENGER_API_URL, sender);
      } else if (text.toLowerCase() === 'help') {
        sendLocationRequestMessage(MESSENGER_API_URL, sender);
      } else{
        sendTextMessage(MESSENGER_API_URL, sender, 'Text received, echo: ' + text.substring(0, 200));
      }
    }
    if (event.postback) {
      const postbackPayload = event.postback.payload;
      if (postbackPayload === GET_STARTED_PAYLOAD) {
        sendTextMessage(MESSENGER_API_URL, sender, 'Sure thing!').then(() => {
          sendLocationRequestMessage(MESSENGER_API_URL, sender);
        });
      } else if (postbackPayload === SHOW_MORE_PAYLOAD) {
        userCache.get(sender, (err, value) => {
          if (!err && value) {
            const businesses = value.businesses;
            const businessStartIndex = value.index + 3;
            const businessEndIndex = businessStartIndex + 3;
            const cardData = businesses.slice(businessStartIndex, businessEndIndex).map(businessResolver);

            if (businesses.length - businessEndIndex > 0) {
              cardData.push({
                "title": 'Show More',
                "image_url": businesses[businessEndIndex].image_url,
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
            }

            userCache.set(sender, {
              businesses,
              index: businessStartIndex,
            });

            sendBusinessCards(MESSENGER_API_URL, sender, cardData);
          }
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

        getYelpLLSearchResults(
          lat,
          long,
          YELP_API_URL,
          YELP_AUTH_API,
          yelpCache,
          YELP_AUTH_GRANT_TYPE,
          YELP_CLIENT_ID,
          YELP_CLIENT_SECRET).then((businesses) => {
          userCache.set(sender, {
            businesses,
            index: 0,
          });

          const cardData = businesses.slice(0, 3).map(businessResolver);

          if (businesses.length > 3) {
            cardData.push({
              "title": 'More Businesses',
              "image_url": businesses[3].image_url,
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
          }

          sendBusinessCards(MESSENGER_API_URL, sender, cardData);
        });
      }
    }
  });
  res.sendStatus(200);
});

app.listen(app.get('port'), function() {
	console.log('running on port', app.get('port'))
});
