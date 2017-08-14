'use strict';

const NodeCache = require('node-cache');
const network = require('./network');
const YELP_CACHE_KEY = 'yelp';

// devConstants folder that should contain your own api keys
const devConstants = require('../devConstants');

// YELP API CONSTANTS
const YELP_CLIENT_ID = process.env.YELP_CLIENT_ID || devConstants.YELP_CLIENT_ID;
const YELP_CLIENT_SECRET = process.env.YELP_CLIENT_SECRET || devConstants.YELP_CLIENT_SECRET;
const YELP_API_URL = 'https://api.yelp.com/v3/businesses/search';
const YELP_AUTH_API = 'https://api.yelp.com/oauth2/token';
const YELP_AUTH_GRANT_TYPE = 'client_credentials';

// YELP TOKEN CACHE (used for saving Yelp Auth Token)
const yelpCache = new NodeCache();

// Retrieves the Yelp Access Token either from Auth api (if expired) or from yelpCache
const getYelpAccessToken = () => {
  yelpCache.get(YELP_CACHE_KEY, (err, value) => {
    if (!err && value) {
      return Promise.resolve(value);
    }
  });

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

  return network.call(config).then((resp) => {
    yelpCache.set(YELP_CACHE_KEY, resp.data.access_token, resp.data.expires_in);
    return resp.data.access_token;
  }, (err) => {
    console.log(err);
  });
};

// Get Yelp search results based on latitude and longitude
const getYelpSearchResults = (params) => {
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
      console.log(err);
    });
  });
};

module.exports = {
  getYelpAccessToken,
  getYelpSearchResults,
};
