'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const NodeCache = require('node-cache');
const Wit = require('node-wit');
const GET_STARTED_PAYLOAD = 'GET_STARTED_PAYLOAD';
const SHOW_MORE_PAYLOAD = 'SHOW_MORE';
const LOCATION_ATTACHMENT_TYPE = 'location';

// devConstants folder that should contain your own api keys
const devConstants = require('./devConstants');

// FB CONSTANTS
const CALLBACK_TOKEN = process.env.FB_VERIFY_TOKEN || devConstants.FB_VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN || devConstants.FB_PAGE_ACCESS_TOKEN;
const MESSENGER_API_URL = `https://graph.facebook.com/v2.6/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;

// YELP CONSTANTS
const YELP_CLIENT_ID = process.env.YELP_CLIENT_ID || devConstants.YELP_CLIENT_ID;
const YELP_CLIENT_SECRET = process.env.YELP_CLIENT_SECRET || devConstants.YELP_CLIENT_SECRET;
const YELP_API_URL = 'https://api.yelp.com/v3/businesses/search';
const YELP_AUTH_API = 'https://api.yelp.com/oauth2/token';
const YELP_AUTH_GRANT_TYPE = 'client_credentials';

// YELP TOKEN CACHE (used for saving Yelp Auth Token)
const yelpCache = new NodeCache();

// USER DATA CACHE
const userCache = new NodeCache();

// HELPER METHODS
const {
  sendTextMessage,
  sendBusinessCards,
  sendGenericErrorMessage,
  sendLocationRequestMessage,
} = require('./messageUtils');

const { getYelpLLSearchResults } = require('./apiHelpers/yelpHelpers');
const { businessResolver } = require('./dataResolvers');

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

// To post data
app.post('/webhook', function (req, res) {
  const messaging_events =
    (req.body.entry && req.body.entry.length && req.body.entry[0] && req.body.entry[0].messaging) ?
      req.body.entry[0].messaging : null;

  messaging_events && messaging_events.forEach((event) => {
    const sender = event && event.sender && event.sender.id;

    // Handle text messages
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

    // Handle a postback (button click)
    if (event.postback) {
      const postbackPayload = event.postback.payload;
      if (postbackPayload === GET_STARTED_PAYLOAD) {
        sendTextMessage(MESSENGER_API_URL, sender, 'Sure thing!').then(() => {
          sendLocationRequestMessage(MESSENGER_API_URL, sender);
        });
      } else if (postbackPayload === SHOW_MORE_PAYLOAD) {

        // Show the next 3 businesses from the results
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

      // Display 3 businesses for the user to view
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

          // Save Yelp results for the user
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
