// An alternative small routing framework vs Hono - https://github.com/kwhitley/itty-router
import { Context, Hono, MiddlewareHandler, Next } from 'hono'
import SlackREST from '@sagi.io/workers-slack'

import {getTypeAndConversationAndPathKey, IncomingEventType, getEventTypeName} from './utils';


type SlackEvent = {
	type: string,
	user?: string
}

type HandlerMap = {
	event: {
		[key: string]: (c: Context, slackClient: SlackRESTClient, event: SlackEvent) => Promise<Response>,
	}
	action: {
		[key: string]: (c: Context, slackClient: SlackRESTClient, body: any) => Promise<Response>,
	},
	command: {},
	options: {},
	viewaction: {},
	shortcut: {}
}

const honoApp = new Hono()

const SlackSetup = (): MiddlewareHandler => {
	return async (c: Context, next: Next) => {
		const SLACK_SIGNING_SECRET = c.env.SLACK_SIGNING_SECRET;
		const botAccessToken  = c.env.SLACK_BOT_TOKEN;
		// workers are serverless, have to set up client for each request
		const slackClient: SlackRESTClient = new SlackREST({ botAccessToken });
		// Add it to context so we can use it across any routes with this middleware
		c.set('SLACK_SIGNING_SECRET', SLACK_SIGNING_SECRET)
		c.set('slackClient', slackClient)
		await next()
	}
}

const SlackVerifier = (): MiddlewareHandler => {
	return async (c: Context, next: Next) => {
		const SLACK_SIGNING_SECRET = c.get('SLACK_SIGNING_SECRET')
		const slackClient = c.get('slackClient')
		// TODO: fail if neither is appropriately setup
		if (slackClient === undefined || slackClient === null) {
			c.status(503)
			return c.json({ok: false, error: 'Slack client not configured'});
		}

		try {
			await slackClient.helpers.verifyRequestSignature(c.req, SLACK_SIGNING_SECRET)
		} catch (e) {
			c.status(404)
			return c.json({ok: false, error: 'invalid request signature'});
		}
		await next()
	  }
}

// TODO: Hono does not export the HTTPException type yet https://github.com/honojs/hono/blob/main/src/http-exception.ts
// honoApp.onError((err: HTTPException, c: Context) => {
// if (err instanceof HTTPException) {
// 	  // Get the custom response
// 	  return err.getResponse()
// 	}
// 	console.error(err)
// 	return c.text('Internal Server Error', 500)
//   })

honoApp.use('/slack/*', SlackSetup())
honoApp.use('/slack/*', SlackVerifier())

const eventHandlerAppMention = async (c: Context, slackClient: SlackRESTClient, event: SlackEvent) => {
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

const eventHandlerAppHomeOpened = async (c: Context, slackClient: SlackRESTClient, event: SlackEvent) => {

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

// TODO: only a small subset of handlers have been implemented for this example use case
const handlers: HandlerMap = {
	event: {
		app_mention: eventHandlerAppMention,
		app_home_opened: eventHandlerAppHomeOpened
	},
	action: {},
	command: {},
	options: {},
	viewaction: {},
	shortcut: {}
}

/*
Endpoints
*/
honoApp.get('/', (c) => c.text('Hello! Hono! Tono!'))

// Slack bolt sets the example of not having separate endpoints for interactive vs events.
honoApp.post('/slack/events', async (c: Context) => {
	const slackClient = c.get('slackClient')
	if (slackClient === undefined || slackClient === null) {
		c.status(503)
		return c.json({ok: false, error: 'Slack client not configured'});
	}

	const textBody = await c.req.text()
	console.log(`==BODY: ${textBody}`)
	const body = JSON.parse(textBody);

	if ("challenge" in body) {
		// https://api.slack.com/apis/connections/events-api#the-events-api__subscribing-to-event-types__events-api-request-urls
		return c.json({
			challenge: body.challenge
		})
	}

	const {type, pathKey, conversationId} = getTypeAndConversationAndPathKey(body);
	const safePathKey = pathKey || "";
	

	switch(type) {
		case IncomingEventType.Event:
			const slackEvent: SlackEvent = body.event;
			const eventType: string = slackEvent.type;
			if (safePathKey in handlers.event) {
				return handlers.event[safePathKey](c, slackClient, slackEvent)
			}
		case IncomingEventType.Action:
			if (safePathKey in handlers.event) {
				return handlers.action[safePathKey](c, slackClient, body)
			}
		default:
			console.debug('skip')
	}

	console.error(`type: ${getEventTypeName(type)} path:${safePathKey} has no handler!!!`)
	c.status(507)
	return c.json({ ok: false, no_handler: true})
})

export default honoApp


