'use strict';

const fetch = require('node-fetch');
const YELP_CACHE_KEY = 'yelp';

const getYelpAccessToken = (authUrl, cache, grantType, clientId, clientSecret) => {
  cache.get(YELP_CACHE_KEY, (err, value) => {
    if (!err) {
      if (!value) {
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
          console.log('$$$$$$$$$$$', JSON.stringify(resp));
        });
      }

      return value;
    }
  })
};

module.exports = {
  getYelpAccessToken,
};
