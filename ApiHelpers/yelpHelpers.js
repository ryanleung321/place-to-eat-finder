'use strict';

const network = require('./network');

// YELP API CONSTANTS
const YELP_API_KEY = process.env.YELP_API_KEY || require('../devConstants').YELP_API_KEY;
const YELP_API_URL = 'https://api.yelp.com/v3/businesses/search';

// Get Yelp search results based on latitude and longitude
const getYelpSearchResults = (params) => {
  console.log('Function: getYelpSearchResults');

    const config = {
      url: YELP_API_URL,
      headers: {
        'Accept': 'application/x-www-form-urlencoded',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${YELP_API_KEY}`
      },
      method: 'get',
      params,
    };

    return network.call(config).then((resp) => {
      return resp.data.businesses;
    }, (err) => {
      console.log('error: ', err);
    });
};

module.exports = {
  getYelpSearchResults,
};
