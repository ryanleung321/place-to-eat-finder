'use strict';

const fetch = require('node-fetch');
const YELP_CACHE_KEY = 'yelp';

// Retrieves the Yelp Access Token either from Auth api (if expired) or from cache
const getYelpAccessToken = (authUrl, cache, grantType, clientId, clientSecret) => {
  cache.get(YELP_CACHE_KEY, (err, value) => {
    if (!err && value) {
      return Promise.resolve(value);
    }
  });

  const requestBody = `grant_type=${grantType}&client_id=${clientId}&client_secret=${clientSecret}`;

  return fetch(authUrl, {
    headers: {
      'Accept': 'application/x-www-form-urlencoded',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    method: 'POST',
    body: requestBody
  }).then((resp) => {
    return resp.json();
  }).then((resp) => {
    cache.set(YELP_CACHE_KEY, resp.access_token, resp.expires_in);
    return resp.access_token;
  });
};

// Get Yelp search results based on latitude and longitude
const getYelpLLSearchResults = (lat, long, apiUrl, authUrl, cache, grantType, clientId, clientSecret) => {
  return getYelpAccessToken(authUrl, cache, grantType, clientId, clientSecret).then((yelpAccessToken) => {
    const queryString = `?term=food&latitude=${lat}&longitude=${long}`;

    return fetch(`${apiUrl}${queryString}`, {
      headers: {
        'Accept': 'application/x-www-form-urlencoded',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${yelpAccessToken}`
      },
      method: 'GET',
    }).then((resp) => {
      return resp.json();
    }).then((resp) => {
      return resp.businesses;
    });
  });
};

module.exports = {
  getYelpAccessToken,
  getYelpLLSearchResults,
};
