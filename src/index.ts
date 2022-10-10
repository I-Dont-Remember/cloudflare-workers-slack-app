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
const SlackREST = require('@sagi.io/workers-slack')

const channelId = "CP1S57DAB"  // conference-2019

const honoApp = new Hono()

honoApp.get('/', (c) => c.text('Hello! Hono! Tono!'))

honoApp.post('/slack/events', async (c) => {
	const body = await c.req.json()
	console.log(`BODY: ${JSON.stringify(body)}`)

	if ("challenge" in body) {
		// https://api.slack.com/apis/connections/events-api#the-events-api__subscribing-to-event-types__events-api-request-urls
		return c.json({
			challenge: body.challenge
		})
	} 

	const botAccessToken  = c.env.SLACK_BOT_TOKEN;
	const slackClient = new SlackREST({ botAccessToken })
	// TODO (optional): validate Slack request is from Slack with signing secret

	// TODO: parse out request events into the different subtypes

	const slackEvent = body.event;

	try {
		// Call chat.postMessage with the built-in client
		const result = await slackClient.chat.postMessage({
		  channel: channelId,
		  text: `Oh boy an event! ${JSON.stringify(slackEvent)}.`
		});
		console.log(result);
	  }	
	  catch (error) {
		console.log(error);
		return c.json({ ok: false, error: error.message})
	  }

	  return c.json({ ok: true })
})

export default honoApp


