// An alternative small routing framework vs Hono - https://github.com/kwhitley/itty-router
import { Context, Hono, MiddlewareHandler, Next } from 'hono'
import {HTTPException} from 'hono/http-exception'
import SlackREST from '@sagi.io/workers-slack'

import {getTypeAndConversationAndPathKey, IncomingEventType, getEventTypeName, buildSampleAppHome} from './utils';

type SlackEvent = {
	type: string,
	user?: string,
	[key: string]: any
}

type HandlerMap = {
	[index: string]: {[index: string]: (c: Context, slackClient: SlackRESTClient, body: any) => Promise<Response>}
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

/*
Hono is supposed to be the fastest, but feel free to use whatever Workers router you see fit.
https://github.com/honojs/hono#benchmarks
*/
const honoApp = new Hono()

const middlewareSlackSetup = (): MiddlewareHandler => {
	return async (c: Context, next: Next) => {
		const SLACK_SIGNING_SECRET: string = c.env.SLACK_SIGNING_SECRET;
		const botAccessToken  = c.env.SLACK_BOT_TOKEN;
		// workers are serverless, have to set up client for each request
		const slackClient: SlackRESTClient = new SlackREST({ botAccessToken });
		// Add it to context so we can use it across any routes with this middleware
		c.set('SLACK_SIGNING_SECRET', SLACK_SIGNING_SECRET)
		c.set('slackClient', slackClient)
		await next()
	}
}

const middlewareSlackVerifier = (): MiddlewareHandler => {
	// This function checks to make sure inbound requests came from Slack, and no other sources.
	return async (c: Context, next: Next) => {
		const SLACK_SIGNING_SECRET = c.get('SLACK_SIGNING_SECRET')
		if (!(typeof SLACK_SIGNING_SECRET == 'string' || SLACK_SIGNING_SECRET instanceof String)) {
			const errMsg = 'Slack signing secret not configured';
			console.error(errMsg)
			c.status(503)
			return c.json({ok: false, error: errMsg});
		}

		const slackClient: SlackRESTClient = c.get('slackClient')
		if (slackClient === undefined || slackClient === null) {
			const errMsg = 'Slack client not configured';
			console.error(errMsg)
			c.status(503)
			return c.json({ok: false, error: errMsg});
		}

		try {
			// Have to pass the original raw Request, rather than a HonoRequest
			await slackClient.helpers.verifyRequestSignature(c.req.raw, SLACK_SIGNING_SECRET)
		} catch (e) {
			const errMsg = 'invalid request signature';
			console.error(errMsg)
			c.status(404)
			return c.json({ok: false, error: errMsg});
		}
		await next()
	  }
}

honoApp.onError((err: HTTPException|Error, c: Context) => {
if (err instanceof HTTPException) {
	  // Get the custom response
	  return err.getResponse()
	}
	console.error('BOOM:', err, err.stack)
	return c.text('Internal Server Error', 500)
  })

honoApp.use('/slack/*', middlewareSlackSetup())
honoApp.use('/slack/*', middlewareSlackVerifier())

const eventHandlerAppMention = async (c: Context, slackClient: SlackRESTClient, body: any) => {
    const event: SlackEvent = body.event;
	// https://api.slack.com/events/app_mention
	try {
		const channelId = event?.channel
		const result = await slackClient.chat.postMessage({
		  channel: channelId,
		  text: `Oh boy an \`app_mention\` event! ${JSON.stringify(event)}.`
		});
	  }	
	  catch (error: any) {
		c.status(400)
		return c.json({ ok: false, error: error.message})
	  }

	  return c.json({ ok: true })
}

const eventHandlerAppHomeOpened = async (c: Context, slackClient: SlackRESTClient, body: any) => {
    // https://api.slack.com/events/app_home_opened
	const event: SlackEvent = body.event;
	const user = event.user || "";
	
	const result = await slackClient.views.publish({
		user_id: user,
		view: buildSampleAppHome(user)
	})
	console.log(`Sent App Home: ${result}`)
	return c.json({ ok: true })
}

// only a small subset of handlers have been implemented for this example use case
const handlers: HandlerMap = {
	event: {
		app_mention: eventHandlerAppMention,
		app_home_opened: eventHandlerAppHomeOpened
		// TODO: your handlers here!	
	},
	action: {
		// TODO: your handlers here!
	},
	command: {
		// TODO: your handlers here!
	},
	options: {
		// TODO: your handlers here!
	},
	viewaction: {
		// TODO: your handlers here!
	},
	shortcut: {
		// TODO: your handlers here!
	}
}

/*
API Endpoints
*/
honoApp.get('/', (c) => c.text('Sample HTML index page.'))

// Slack bolt sets the example of not having separate endpoints for interactive vs events (as seen in slack_app_manifest.yml)
honoApp.post('/slack/events', async (c: Context) => {
	// slackClient is initialized in the middleware functions - could just as easily be done here if preferred.
	const slackClient = c.get('slackClient')
	if (slackClient === undefined || slackClient === null) {
		const errMsg = 'Slack client not configured';
		console.error(errMsg)
		c.status(503)
		return c.json({ok: false, error: errMsg});
	}

	const textBody = await c.req.text()
	const body = JSON.parse(textBody);
	if ("challenge" in body) {
		// https://api.slack.com/apis/connections/events-api#the-events-api__subscribing-to-event-types__events-api-request-urls
		return c.json({
			challenge: body.challenge
		})
	}

	const {type, pathKey, conversationId} = getTypeAndConversationAndPathKey(body);
	const safePathKey = pathKey || "";
	
	const incomingEventTypeName = getEventTypeName(type).toLowerCase()
	const handlersForType = handlers[incomingEventTypeName]

	const eventInfoMsg = `type: ${incomingEventTypeName} path:${safePathKey}`;

	console.log(eventInfoMsg)
	// this only works well if you want all handlers to get same input variables...
	if (safePathKey in handlersForType) {
		return handlersForType[safePathKey](c, slackClient, body)
	} 
	console.error(`${eventInfoMsg} - has no handler!`)
	c.status(507)
	return c.json({ ok: false, no_handler: true})
})

export default honoApp


