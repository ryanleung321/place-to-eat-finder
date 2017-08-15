const axios = require('axios');

const call = (config) => {
  return axios(config);
};

module.exports.call = call;
