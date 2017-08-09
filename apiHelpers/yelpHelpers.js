'use strict';

const fetch = require('node-fetch');
const YELP_CACHE_KEY = 'yelp';

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

const getYelpLLSearchResults = (lat, long, apiUrl, authUrl, cache, grantType, clientId, clientSecret) => {
  getYelpAccessToken(authUrl, cache, grantType, clientId, clientSecret).then((yelpAccessToken) => {
    const queryString = `?latitude=${lat}&longitude=${long}`;

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
      console.log(resp);
      return resp;
    });
  });
};

module.exports = {
  getYelpAccessToken,
  getYelpLLSearchResults,
};
