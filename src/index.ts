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
import { Context, Hono } from 'hono'
import SlackREST from '@sagi.io/workers-slack'

type SlackEvent = {
	type: string,
	user?: string
}

type HandlerMap = {
	[key: string]: (c: Context, slackClient: SlackRESTClient, event: SlackEvent) => Promise<Response>,
}

const honoApp = new Hono()

const handlerAppMention = async (c: Context, slackClient: SlackRESTClient, event: SlackEvent) => {
	try {
		const channelId = "CP1S57DAB"  // conference-2019

		// Call chat.postMessage with the built-in client
		// const result = await slackClient.chat.postMessage({
		//   channel: channelId,
		//   text: `Oh boy an event! ${JSON.stringify(event)}.`
		// });
		// console.log(result);
	  }	
	  catch (error: any) {
		console.log(error);
		return c.json({ ok: false, error: error.message})
	  }

	  return c.json({ ok: true })
}

const handlerAppHomeOpened = async (c: Context, slackClient: SlackRESTClient, event: SlackEvent) => {

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

let eventHandlers: HandlerMap= {
	app_mention: handlerAppMention,
	app_home_opened: handlerAppHomeOpened
}

/*
Endpoints
*/
honoApp.get('/', (c) => c.text('Hello! Hono! Tono!'))

honoApp.post('/slack/events', async (c: Context) => {
	const SLACK_SIGNING_SECRET = c.env.SLACK_SIGNING_SECRET;
	const botAccessToken  = c.env.SLACK_BOT_TOKEN;
	// workers are serverless, have to set up client for each request
	const slackClient: SlackRESTClient = new SlackREST({ botAccessToken });

	// const rawBody = await c.req.text()
	// const clonedRequest = c.req.clone()
	const textBody = await c.req.text()
	console.log(`==BODY: ${textBody}`)
	const body = JSON.parse(textBody);

	if ("challenge" in body) {
		// https://api.slack.com/apis/connections/events-api#the-events-api__subscribing-to-event-types__events-api-request-urls
		return c.json({
			challenge: body.challenge
		})
	} 

	try {
		await slackClient.helpers.verifyRequestSignature(c.req, SLACK_SIGNING_SECRET)
	} catch (e) {
		c.status(404)
		return c.json({ok: false, error: 'invalid request signature'});
	}


	const slackEvent: SlackEvent = body.event;
	const eventType: string = slackEvent.type;

	if (eventType in eventHandlers) {
		return eventHandlers[eventType](c, slackClient, slackEvent)
	}

	// event type not found
	console.error(`EVENT_TYPE: ${eventType} has no handler!!!`)
	return c.json({ ok: true, no_handler: true})
})

export default honoApp


