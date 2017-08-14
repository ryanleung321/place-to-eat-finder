'use strict';

const NodeCache = require('node-cache');
const GET_STARTED_PAYLOAD = 'GET_STARTED_PAYLOAD';
const SHOW_MORE_PAYLOAD = 'SHOW_MORE';
const { Wit, log } = require('node-wit');

// devConstants folder that should contain your own api keys
const devConstants = require('./devConstants');

// FB CONSTANTS
const WIT_AI_ACCESS_TOKEN = process.env.WIT_AI_ACCESS_TOKEN || devConstants.WIT_AI_ACCESS_TOKEN;

const { getYelpLLSearchResults } = require('./ApiHelpers/yelpHelpers');
const { businessResolver } = require('./dataResolvers');

// USER DATA CACHE
const userCache = new NodeCache();

// WIT AI SETUP
const witClient = new Wit({
  accessToken: WIT_AI_ACCESS_TOKEN,
  logger: new log.Logger(log.DEBUG)
});

// WIT AI ENTITY VALUES
const SORT_DEFUALT = 'best_match';
const SORT_DISTANCE = 'distance';
const SORT_RATING = 'rating';

const {
  appendShowMoreCard,
  sendTextMessage,
  sendBusinessCards,
  sendGenericErrorMessage,
  sendLocationRequestMessage,
} = require('./ApiHelpers/messageUtils');

const handlePostbackMessage = (sender, postbackPayload) => {
  if (postbackPayload === GET_STARTED_PAYLOAD) {
    sendTextMessage(sender, 'Sure thing!').then(() => {
      sendLocationRequestMessage(sender);
    });
  } else if (postbackPayload === SHOW_MORE_PAYLOAD) {

    // Show the next 3 businesses from the results
    userCache.get(sender, (err, value) => {
      if (!err && value) {
        const businesses = value.businesses;
        const businessStartIndex = value.index + 3;
        const businessEndIndex = businessStartIndex + 3;
        let cardData = businesses.slice(businessStartIndex, businessEndIndex).map(businessResolver);

        if (businesses.length - businessEndIndex > 0) {
          cardData = appendShowMoreCard(cardData,  businesses[businessEndIndex].image_url);
        }

        userCache.set(sender, {
          businesses,
          index: businessStartIndex,
        });

        sendBusinessCards(sender, cardData);
      }
    });
  }
};

const handleLocationMessage = (sender, locations) => {
  // Display 3 businesses for the user to view
  if (locations.length) {
    const userLocation = locations[0] && locations[0].payload && locations[0].payload.coordinates;
    const lat = userLocation.lat;
    const long = userLocation.long;

    getYelpLLSearchResults(lat, long).then((businesses) => {
      if (!(businesses && businesses.length)) {
        sendTextMessage(sender, 'Sorry but no places to eat where found near you.');
      } else {
        // Save Yelp results for the user
        userCache.set(sender, {
          businesses,
          index: 0,
        });

        let cardData = businesses.slice(0, 3).map(businessResolver);

        if (businesses.length > 3) {
          cardData = appendShowMoreCard(cardData, businesses[3].image_url);
        }

        sendBusinessCards(sender, cardData);
      }
    });
  }
}

const handleTextMessage = (sender, text) => {
  witClient.message(text, {}).then((resp) => {
    console.log('!!!!!!!!!!!', JSON.stringify(resp));
    if (!(resp && resp.entities)) {
      sendGenericErrorMessage(sender);
    } else {
      const entityData = resp.entities;
      if (entityData.help) {
        sendLocationRequestMessage(sender);
      } else if (entityData.location) {
        if (!(entityData.sort.length && entityData.sort[0].value)) {
          sendGenericErrorMessage(sender);
        }
      } else if (entityData.sort) {
        sendTextMessage(sender, 'I need a location before I can find you places to eat.');
      } else {
        sendGenericErrorMessage(sender);
      }
    }
  });
};

module.exports = {
  handleLocationMessage,
  handlePostbackMessage,
  handleTextMessage,
};
