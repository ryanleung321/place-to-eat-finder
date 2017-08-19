'use strict';

const NodeCache = require('node-cache');
const network = require('./network');
const YELP_CACHE_KEY = 'yelp';

// YELP API CONSTANTS
const YELP_CLIENT_ID = process.env.YELP_CLIENT_ID || require('../devConstants').YELP_CLIENT_ID;
const YELP_CLIENT_SECRET = process.env.YELP_CLIENT_SECRET || require('../devConstants').YELP_CLIENT_SECRET;
const YELP_API_URL = 'https://api.yelp.com/v3/businesses/search';
const YELP_AUTH_API = 'https://api.yelp.com/oauth2/token';
const YELP_AUTH_GRANT_TYPE = 'client_credentials';

// YELP TOKEN CACHE (used for saving Yelp Auth Token)
const yelpCache = new NodeCache();

// Retrieves the Yelp Access Token either from Auth api (if expired) or from yelpCache
const getYelpAccessToken = () => {
  console.log('Function: getYelpAccessToken');

  return new Promise((resolve) => {
    yelpCache.get(YELP_CACHE_KEY, (err, value) => {
      if (!err && value) {
        resolve(value);
      } else {
        const requestBody = `grant_type=${YELP_AUTH_GRANT_TYPE}&client_id=${YELP_CLIENT_ID}&client_secret=${YELP_CLIENT_SECRET}`;

        const config = {
          url: YELP_AUTH_API,
          headers: {
            'Accept': 'application/x-www-form-urlencoded',
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          method: 'post',
          data: requestBody
        };

        network.call(config).then((resp) => {
          yelpCache.set(YELP_CACHE_KEY, resp.data.access_token, resp.data.expires_in);
          resolve(resp.data.access_token);
        }, (err) => {
          console.log('error: ', err);
        });
      }
    });
  });
};

// Get Yelp search results based on latitude and longitude
const getYelpSearchResults = (params) => {
  console.log('Function: getYelpSearchResults');

  return getYelpAccessToken().then((yelpAccessToken) => {
    const config = {
      url: YELP_API_URL,
      headers: {
        'Accept': 'application/x-www-form-urlencoded',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${yelpAccessToken}`
      },
      method: 'get',
      params,
    };

    return network.call(config).then((resp) => {
      return resp.data.businesses;
    }, (err) => {
      console.log('error: ', err);
    });
  });
};

module.exports = {
  getYelpAccessToken,
  getYelpSearchResults,
};
