'use strict';

const NodeCache = require('node-cache');
const GET_STARTED_PAYLOAD = 'GET_STARTED_PAYLOAD';
const SHOW_MORE_PAYLOAD = 'SHOW_MORE';
const { Wit, log } = require('node-wit');

// devConstants folder that should contain your own api keys
const devConstants = require('./devConstants');

// FB CONSTANTS
const WIT_AI_ACCESS_TOKEN = process.env.WIT_AI_ACCESS_TOKEN || devConstants.WIT_AI_ACCESS_TOKEN;

const { getYelpSearchResults } = require('./ApiHelpers/yelpHelpers');
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
  sendGreetingMessage,
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
    const latitude = userLocation.lat;
    const longitude = userLocation.long;

    const params = {
      term: 'food',
      latitude,
      longitude,
    };

    getYelpSearchResults(params).then((businesses) => {
      if (!(businesses && businesses.length)) {
        sendTextMessage(sender, 'Sorry but no places to eat where found near you.');
      } else {
        // Save Yelp results for the user
        userCache.set(sender, {
          businesses,
          index: 0,
          latitude,
          longitude,
        });

        let cardData = businesses.slice(0, 3).map(businessResolver);

        if (businesses.length > 3) {
          cardData = appendShowMoreCard(cardData, businesses[3].image_url);
        }

        sendBusinessCards(sender, cardData);
      }
    });
  }
};

const handleTextMessage = (sender, text) => {
  witClient.message(text, {}).then((resp) => {
    console.log('!!!!!!!!!!!', JSON.stringify(resp));
    if (!(resp && resp.entities)) {
      sendGenericErrorMessage(sender);
    } else {
      const entityData = resp.entities;
      if (entityData.help) {
        // Send a request for a location
        sendLocationRequestMessage(sender);
      } else if (entityData.greetings) {
        sendGreetingMessage(sender);
      } else if (entityData.location
        && entityData.location[0]
        && entityData.location[0].value) {

        let params = {
          term: 'food',
          location: entityData.location[0].value
        };

        // Add sort type to params if sort type was present in the message
        if (entityData.sort
          && entityData.sort.length
          && entityData.sort[0]
          && entityData.sort[0].value) {

          params['sort_by'] = entityData.sort[0].value;
        }

        // Add price range to params if price was present in the message
        if (entityData.price
          && entityData.price.length
          && entityData.price[0]
          && entityData.price[0].value) {

          params['price'] = entityData.price[0].value;
        }

        getYelpSearchResults(params).then((businesses) => {
          if (!(businesses && businesses.length)) {
            sendTextMessage(sender, 'Sorry but no places to eat where found near you.');
          } else {
            // Save Yelp results for the user
            userCache.set(sender, {
              businesses,
              index: 0,
              location: params.location,
            });

            let cardData = businesses.slice(0, 3).map(businessResolver);

            if (businesses.length > 3) {
              cardData = appendShowMoreCard(cardData, businesses[3].image_url);
            }

            sendBusinessCards(sender, cardData);
          }
        });
      } else if (entityData.sort || entityData.price) {
        // Handle a message with a sort value but no location
        userCache.get(sender, (err, value) => {
          let params = {
            term: 'food',
          };

          if (!err && value) {
            if (value.location) {
              params['location'] = value.location;
            } else if (value.latitude && value.longitude) {
              params['latitude'] = value.latitude;
              params['longitude'] = value.longitude;
            } else {
              // Let the user know that no location was given previously
              return sendNoLocationMessage(sender);
            }

            // Add sort type to params if sort type was present in the message
            if (entityData.sort
              && entityData.sort.length
              && entityData.sort[0]
              && entityData.sort[0].value) {

              params['sort_by'] = entityData.sort[0].value;
            }

            // Add price range to params if price was present in the message
            if (entityData.price
              && entityData.price.length
              && entityData.price[0]
              && entityData.price[0].value) {

              params['price'] = entityData.price[0].value;
            }

            getYelpSearchResults(params).then((businesses) => {
              if (!(businesses && businesses.length)) {
                sendTextMessage(sender, 'Sorry but no places to eat were found near you.');
              } else {
                // Save Yelp results for the user
                userCache.set(sender, {
                  businesses,
                  index: 0,
                  latitude: params.latitude ? params.latitude : null,
                  longitude: params.longitude ? params.longitude : null,
                  location: params.location ? params.location : null,
                });

                let cardData = businesses.slice(0, 3).map(businessResolver);

                if (businesses.length > 3) {
                  cardData = appendShowMoreCard(cardData, businesses[3].image_url);
                }

                sendBusinessCards(sender, cardData);
              }
            });
          } else {
            // Let the user know that no location was given previously
            return sendNoLocationMessage(sender);
          }

        });
      } else {
        sendGenericErrorMessage(sender);
      }
    }
  });
};

const sendNoLocationMessage = (sender) => {
  const NO_LOCATION_TEXT = 'I need a location before I can find you places to eat.';

  sendTextMessage(sender, NO_LOCATION_TEXT).then(() => {
    sendLocationRequestMessage(sender);
  });
};

module.exports = {
  handleLocationMessage,
  handlePostbackMessage,
  handleTextMessage,
};
