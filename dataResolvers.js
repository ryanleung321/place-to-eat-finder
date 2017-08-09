'use strict';

const businessResolver = (business) => {
  if (!business) return null;

  return {
    "title": `${business.name} | ${business.rating}/5 - ${business.price}`,
    "subtitle": `${business.display_phone} | ${business.location.address1}`,
    "image_url": business.image_url,
    "default_action": {
      "type": "web_url",
      "url": business.url
    },
    "buttons": [{
      "type": "phone_number",
      "title": "Call",
      "payload": business.phone
    }, {
      "type": "web_url",
      "url": business.url,
      "title": "Details"
    }],
  }
};

module.exports = {
  businessResolver,
};
