'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const fetch = require('node-fetch');
const app = express();
const callbackToken = process.env.VERIFY_TOKEN || 'devToken';
const pageAccessToken = process.env.PAGE_ACCESS_TOKEN || "EAAEayvkpajwBAHbbWc3zieawFpIUHwYTIZBz0qQUwuUmhNXZALpULz6Gr4Ei5zqIqSZCy0IzbTKX8TXS0Maf9luMxl5Kt2dYeecs0MwRiabsEcrmZAhoxEfpZBB4EroxmKiEnQt5ZCIg32Ss0jNS7aHU0dI1a0X2SLGwOkvNQHnQZDZD";
const apiUrl = `https://graph.facebook.com/v2.6/me/messages?access_token=${pageAccessToken}`;

app.set('port', (process.env.PORT || 5000));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))

// parse application/json
app.use(bodyParser.json());

// index
app.get('/', function (req, res) {
	res.send("hello there");
})

// for facebook verification
app.get('/webhook', function (req, res) {
	if (req.query['hub.verify_token'] === callbackToken) {
		res.status(200).send(req.query['hub.challenge']);
	} else {
		res.status(400).send('Error, wrong token');
	}
});

// to post data
app.post('/webhook', function (req, res) {
  const messaging_events =
    (req.body.entry && req.body.entry.length && req.body.entry[0] && req.body.entry[0].messaging) ?
      req.body.entry[0].messaging : null;
  messaging_events.forEach((event) => {
    const sender = event && event.sender && event.sender.id;
    if (event.message && event.message.text) {
      let text = event.message.text;
      if (text.toLowerCase() === 'cards') {
        sendMessageCards(sender);
      } else {
        sendTextMessage(sender, "Text received, echo: " + text.substring(0, 200));
      }
    }
    if (event.postback) {
      let text = JSON.stringify(event.postback);
      sendTextMessage(sender, "Postback received: " + text.substring(0, 200), pageAccessToken);
    }
  });
  res.sendStatus(200);
});

function sendTextMessage(sender, text) {
	let messageData = { text:text };

  const requestBody = JSON.stringify({
    recipient: {
      id: sender
    },
    message: messageData
  });

  fetch(apiUrl, {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    method: 'POST',
    body: requestBody
  }).then((resp) => {
    return resp.json();
  }).then((resp) => {
    console.log(resp);
  });
}

function sendMessageCards(sender) {
	let messageData = {
		"attachment": {
			"type": "template",
			"payload": {
				"template_type": "generic",
				"elements": [{
					"title": "First card",
					"subtitle": "Element #1 of an hscroll",
					"image_url": "http://messengerdemo.parseapp.com/img/rift.png",
					"buttons": [{
						"type": "web_url",
						"url": "https://www.messenger.com",
						"title": "web url"
					}, {
						"type": "postback",
						"title": "Postback",
						"payload": "Payload for first element in a generic bubble",
					}],
				}, {
					"title": "Second card",
					"subtitle": "Element #2 of an hscroll",
					"image_url": "http://messengerdemo.parseapp.com/img/gearvr.png",
					"buttons": [{
						"type": "postback",
						"title": "Postback",
						"payload": "Payload for second element in a generic bubble",
					}],
				}]
			}
		}
	};

	const requestBody = JSON.stringify({
    recipient: {
      id: sender
    },
    message: messageData
  });

	fetch(apiUrl, {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    method: 'POST',
    body: requestBody
  }).then((resp) => {
    return resp.json();
  }).then((resp) => {
    console.log(resp);
	});
}

function sendGenericErrorMessage(sender) {
  sendTextMessage(sender, "An error occured! Sorry for the inconvenience.");
}

app.listen(app.get('port'), function() {
	console.log('running on port', app.get('port'))
});
