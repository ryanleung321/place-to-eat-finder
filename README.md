# Yelp Me Eat

This is a Facebook Messenger chat bot that utlizes Facebook's Wit.ai for natural language processing and Yelp's search API to show users places to eat given a location. Users are able to filter the results by providing a desired time or date, price range, or by requesting closer businesses.

![Screenshot of conversation](https://imgur.com/a/dsMBYOv)

To see the bot in action, send a message to Yelp Me Eat in Facebook messenger or visit this page: https://www.facebook.com/yelpmeeat/

To run locally, use `npm start` to start the express server.

For testing purposes use ngrok to expose your localhost and align it with your facebook page.

## Resources
Facebook Quickstart: https://developers.facebook.com/docs/messenger-platform/guides/quick-start

Yelp API Documentation: https://www.yelp.com/developers/documentation/v3/business_search

Wit.ai Quickstart: https://wit.ai/docs/quickstart

ngrok: https://ngrok.com/

## Dev Constants
should look like this:
```
'use strict';

const YELP_API_KEY = 'INSERT_HERE';
const FB_PAGE_ACCESS_TOKEN = 'INSERT_HERE';
const FB_VERIFY_TOKEN = 'INSERT_HERE';
const WIT_AI_ACCESS_TOKEN = 'INSERT_HERE';

module.exports = {
  YELP_API_KEY,
  FB_PAGE_ACCESS_TOKEN,
  FB_VERIFY_TOKEN,
  WIT_AI_ACCESS_TOKEN,
};
```
