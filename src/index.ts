/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
// src/index.ts
import { Hono } from 'hono'
import SlackREST from '@sagi.io/workers-slack'

const honoApp = new Hono()

function byteStringToUint8Array(byteString) {
	const ui = new Uint8Array(byteString.length);
	for (let i = 0; i < byteString.length; ++i) {
	  ui[i] = byteString.charCodeAt(i);
	}
	return ui;
  }

const hexToBuffer = (hex: string) => {
	const matches = hex.match(/[\da-f]{2}/gi) ?? [];
	const typedArray = new Uint8Array(
	  matches.map(function (h) {
		return parseInt(h, 16);
	  })
	);
	return typedArray.buffer;
  };

const verifySlackRequestSignature = async ({
	signingSecret, requestSignature, requestTimestamp, body,
  }) => {
	console.log('Attempting verification')
	const algorithm = { name: 'HMAC', hash: 'SHA-256' };
	const encoder = new TextEncoder();

	// based of Slack SDK tooling https://github.com/slackapi/node-slack-sdk/blob/c066a8923eda07a4997fa186d009a7ad6b225800/packages/events-api/src/http-handler.ts#L38
	const fiveMinutesAgo = Math.floor(Date.now() / 1000) - (60 * 5);
	console.log(fiveMinutesAgo, requestSignature, requestTimestamp, body)

	if (requestTimestamp < fiveMinutesAgo) {
		console.debug('request older than 5 mins')
		// TODO: FAILURE!
	}

	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(signingSecret),
		algorithm,
		false,
		['sign', 'verify']
	  );
	console.log('got crypto key')

	const [version, hash] = requestSignature.split('=');

	const dataToAuthenticate = `${version}:${requestTimestamp}:${body}`;
  
	const generatedSignature = await crypto.subtle.sign(
		algorithm.name,
		key,
		encoder.encode(dataToAuthenticate)
	);
	console.log(`Generated Signature vs hash: ${generatedSignature} vs ${hash}`)

	const verified = await crypto.subtle.verify(
		algorithm.name,
		key,
		hexToBuffer(hash),
		encoder.encode(dataToAuthenticate)
	  );
	console.log(`isVerified: ${verified}`)

	console.debug('request verification successful')
	return verified;
}

const handlerAppMention = async (c, slackClient, event) => {
	try {
		const channelId = "CP1S57DAB"  // conference-2019

		// Call chat.postMessage with the built-in client
		const result = await slackClient.chat.postMessage({
		  channel: channelId,
		  text: `Oh boy an event! ${JSON.stringify(event)}.`
		});
		console.log(result);
	  }	
	  catch (error) {
		console.log(error);
		return c.json({ ok: false, error: error.message})
	  }

	  return c.json({ ok: true })
}

const handlerAppHomeOpened = async (c, slackClient, event) => {

	const appHomeView = {
		type: 'home',
		blocks: [
			{
				"type": "section",
				"text": {
					"type": "mrkdwn",
					"text": `Example app home with emojis! 😀 and more! <@${event.user}>`
				}
			},
		]
	}
	const result = await slackClient.views.publish({
		user_id: event.user,
		view: appHomeView
	})
	console.log(result)

	return c.json({ ok: true })
}

let eventHandlers = {
	app_mention: handlerAppMention,
	app_home_opened: handlerAppHomeOpened
}

/*
Endpoints
*/
honoApp.get('/', (c) => c.text('Hello! Hono! Tono!'))

honoApp.post('/slack/events', async (c) => {
	// const rawBody = await c.req.text()
	const textBody = await c.req.text()
	console.log(`|| BODY: ${textBody}`)
	const body = JSON.parse(textBody);

	if ("challenge" in body) {
		// https://api.slack.com/apis/connections/events-api#the-events-api__subscribing-to-event-types__events-api-request-urls
		return c.json({
			challenge: body.challenge
		})
	} 

	// TODO: insecure without this working
	const verified = await verifySlackRequestSignature({
		signingSecret: c.env.SLACK_SIGNING_SECRET,
		requestSignature: c.req.header('x-slack-signature'),
		requestTimestamp: parseInt(c.req.header('x-slack-request-timestamp'), 10),
		body: textBody // might blow up in our face
	});

	// if (!verified) {
	// 	c.status(404)
	// 	return c.json({ok: false, error: 'invalid request signature'});
	// }

	// workers are serverless, have to set up client for each request
	const botAccessToken  = c.env.SLACK_BOT_TOKEN;
	const slackClient = new SlackREST({ botAccessToken });

	// TODO (optional): validate Slack request is from Slack with signing secret
	const slackEvent = body.event;
	const eventType = slackEvent.type;

	if (eventType in eventHandlers) {
		return eventHandlers[eventType](c, slackClient, slackEvent)
	}

	// event type not found
	console.error(`EVENT_TYPE: ${eventType} has no handler!!!`)
	return c.json({ ok: true, no_handler: true})
})

export default honoApp


