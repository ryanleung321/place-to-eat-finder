'use strict';

const NodeCache = require('node-cache');
const moment = require('moment');
const network = require('./ApiHelpers/network');
const GET_STARTED_PAYLOAD = 'GET_STARTED_PAYLOAD';
const SHOW_MORE_PAYLOAD = 'SHOW_MORE';
const { Wit, log } = require('node-wit');

// FB CONSTANTS
const WIT_AI_ACCESS_TOKEN = process.env.WIT_AI_ACCESS_TOKEN || require('./devConstants').WIT_AI_ACCESS_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN || require('./devConstants').FB_PAGE_ACCESS_TOKEN;
const FB_USER_API_URL = 'https://graph.facebook.com/v2.6/';

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

// PROMPTS
const showMorePrompt = 'Would you like me to show more?';

const {
  appendShowMoreCard,
  sendTextMessage,
  sendBusinessCards,
  sendGenericErrorMessage,
  sendLocationRequestMessage,
  sendGreetingMessage,
} = require('./ApiHelpers/messageUtils');

const getUserTimezoneOffset = (sender) => {
  console.log('Function: getUserTimezoneOffset');

  return new Promise((resolve) => {
    userCache.get(sender, (err, value) => {
      if (!err && value && value.timezone) {
        resolve(value.timezone);
      } else {
        const config = {
          url: `${FB_USER_API_URL}${sender}`,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          params: {
            fields: 'timezone',
            access_token: PAGE_ACCESS_TOKEN,
          },
          method: 'GET',
        };

        return network.call(config).then((resp) => {
          console.log('response: ', resp.data);
          userCache.set(sender, {
            businesses: value && value.businesses ? value.businesses : null,
            index: value && value.index ? value.index : null,
            latitude: value && value.latitude ? value.latitude : null,
            longitude: value && value.longitude ? value.longitude : null,
            location: value && value.location ? value.location : null,
            timezone: resp.data.timezone,
          });
          resolve(resp.data.timezone);
        }, (err) => {
          console.log('error: ', err);
        });
      }
    });
  });
};

const handleShowMore = (sender) => {
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
        latitude: value.latitude ? value.latitude : null,
        longitude: value.longitude ? value.longitude : null,
        location: value.location ? value.location : null,
      });

      sendBusinessCards(sender, cardData).then(() => {
        if (businesses.length - businessEndIndex > 0) {
          sendTextMessage(sender, showMorePrompt);
        }
      });
    }
  });
};

const handlePostbackMessage = (sender, postbackPayload) => {
  console.log('Function: handlePostbackMessage');

  if (postbackPayload === GET_STARTED_PAYLOAD) {
    sendTextMessage(sender, 'Sure thing!').then(() => {
      const locationMessage = 'Just send me your location and we can begin! Feel free to ask me for help if you\'d like to see everything I can do';
      sendLocationRequestMessage(sender, locationMessage);
    });
  } else if (postbackPayload === SHOW_MORE_PAYLOAD) {
    handleShowMore(sender);
  }
};

const handleLocationMessage = (sender, locations) => {
  console.log('Function: handleLocationMessage');

  // Display 3 businesses for the user to view
  if (locations.length) {
    const userLocation = locations[0] && locations[0].payload && locations[0].payload.coordinates;
    const latitude = userLocation.lat;
    const longitude = userLocation.long;

    const params = {
      term: 'food',
      open_now: true,
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

        sendBusinessCards(sender, cardData).then(() => {
          if (businesses.length > 3) {
            sendTextMessage(sender, showMorePrompt);
          }
        });
      }
    });
  }
};

const handleTextMessage = (sender, text) => {
  console.log('Function: handleTextMessage');

  witClient.message(text, {}).then((resp) => {
    if (!(resp && resp.entities)) {
      sendGenericErrorMessage(sender);
    } else {
      getUserTimezoneOffset(sender).then((timezone) => {
        const entityData = resp.entities;
        if (entityData.help) {
          const locationMessage = 'I can help you find places to eat when you send me your location. Narrow your search down by sending me the time or cost as well. I can also sort the results by distance or rating if you would like. Just ask and we can get started!';

          // Send a request for a location
          sendLocationRequestMessage(sender, locationMessage);
        } else if (entityData.greetings) {
          sendGreetingMessage(sender);
        } else if (entityData.more
          && entityData.more[0]
          && entityData.more[0].value
          && !entityData.price) {
          if (entityData.more[0].value === 'true') {
            handleShowMore(sender);
          } else {
            sendTextMessage(sender, 'Alright, just let me know if you change your mind!');
          }
        } else if (entityData.location
          && entityData.location[0]
          && entityData.location[0].value) {

          let params = {
            term: 'food',
            open_now: true,
            location: entityData.location[0].value,
          };

          // Swap term in params if term was present in the message
          if (entityData.term
            && entityData.term.length
            && entityData.term[0]
            && entityData.term[0].value) {

            params.term = entityData.term[0].value;
          }

          // Add sort type to params if sort type was present in the message
          if (entityData.sort
            && entityData.sort.length
            && entityData.sort[0]
            && entityData.sort[0].value) {

            params.sort_by = entityData.sort[0].value;
          }

          // Add price range to params if price was present in the message
          if (entityData.price
            && entityData.price.length
            && entityData.price[0]
            && entityData.price[0].value) {

            params.price = entityData.price[0].value;
          }

          // Add time to params if time was present in the message
          if (entityData.datetime
            && entityData.datetime.length
            && entityData.datetime[0]
            && entityData.datetime[0].value) {

            const datetime = entityData.datetime[0].value;
            const unixTime = new moment(datetime).utc().unix();
            const timezoneOffset = timezone * -3600;
            params.open_now = false;
            params.open_at = unixTime + timezoneOffset;
          }

          // Add meal time to params if time was present in the message
          if (entityData.time
            && entityData.time.length
            && entityData.time[0]
            && entityData.time[0].value) {

            const hour = entityData.time[0].value;
            const time = new moment().utc();
            time.hours(hour);
            time.minutes(0);
            time.seconds(0);
            const unixTime = time.unix();
            const timezoneOffset = timezone * -3600;
            params.open_now = false;
            params.open_at = unixTime + timezoneOffset;
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

              sendBusinessCards(sender, cardData).then(() => {
                if (businesses.length > 3) {
                  sendTextMessage(sender, showMorePrompt);
                }
              });
            }
          });
        } else if (entityData.sort || entityData.price || entityData.datetime || entityData.time || entityData.term) {
          // Handle a message with a sort value but no location
          userCache.get(sender, (err, value) => {
            let params = {
              term: 'food',
              open_now: true,
            };

            if (!err && value) {
              if (value.location) {
                params.location = value.location;
              } else if (value.latitude && value.longitude) {
                params.latitude = value.latitude;
                params.longitude = value.longitude;
              } else {
                // Let the user know that no location was given previously
                return sendNoLocationMessage(sender);
              }

              // Swap term in params if term was present in the message
              if (entityData.term
                && entityData.term.length
                && entityData.term[0]
                && entityData.term[0].value) {

                params.term = entityData.term[0].value;
              }

              // Add sort type to params if sort type was present in the message
              if (entityData.sort
                && entityData.sort.length
                && entityData.sort[0]
                && entityData.sort[0].value) {

                params.sort_by = entityData.sort[0].value;
              }

              // Add price range to params if price was present in the message
              if (entityData.price
                && entityData.price.length
                && entityData.price[0]
                && entityData.price[0].value) {

                params.price = entityData.price[0].value;
              }

              // Add time to params if time was present in the message
              if (entityData.datetime
                && entityData.datetime.length
                && entityData.datetime[0]
                && entityData.datetime[0].value) {

                const datetime = entityData.datetime[0].value;
                const unixTime = new moment(datetime).utc().unix();
                const timezoneOffset = timezone * -3600;
                params.open_now = false;
                params.open_at = unixTime + timezoneOffset;
              }

              // Add meal time to params if time was present in the message
              if (entityData.time
                && entityData.time.length
                && entityData.time[0]
                && entityData.time[0].value) {

                const hour = entityData.time[0].value;
                const time = new moment().utc();
                time.hours(hour);
                time.minutes(0);
                time.seconds(0);
                const unixTime = time.unix();
                const timezoneOffset = timezone * -3600;
                params.open_now = false;
                params.open_at = unixTime + timezoneOffset;
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

                  sendBusinessCards(sender, cardData).then(() => {
                    if (businesses.length > 3) {
                      sendTextMessage(sender, showMorePrompt);
                    }
                  });
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
      });
    }
  });
};

const sendNoLocationMessage = (sender) => {
  console.log('Function: sendNoLocationMessage');

  const NO_LOCATION_TEXT = 'I need a location before I can help.';

  sendTextMessage(sender, NO_LOCATION_TEXT).then(() => {
    const locationMessage = 'Just send me your location and I\'ll find you places to eat nearby!';
    sendLocationRequestMessage(sender, locationMessage);
  });
};

module.exports = {
  handleLocationMessage,
  handlePostbackMessage,
  handleTextMessage,
};
