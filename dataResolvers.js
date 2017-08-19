'use strict';

const businessResolver = (business) => {
  console.log('Function: businessResolver');

  if (!business) return null;

  const titleRating = business.rating ? `${business.rating}/5` : '';
  const titlePrice = business.price ? `${business.price}` : '';
  const title = `${business.name} || ${titleRating} | ${titlePrice}`;

  const subtitlePhone = business.display_phone ? `${business.display_phone} | ` : '';
  const subtitleAddress = business.location && business.location.address1 ?
    `${business.location.address1}` : '';
  const subtitle = `${subtitlePhone}${subtitleAddress}`;

  return {
    "title": title,
    "subtitle": subtitle,
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
