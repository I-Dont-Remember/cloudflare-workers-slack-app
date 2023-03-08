# Slack App on Cloudflare Workers

Building out a minimal Slack App on Cloudflare Workers to take advantage of the many utilities that are available (and continue to be released) on their platform.

Uses the [Sagi Slack client for Cloudflare Workers](https://sagi.io/slack-api-for-cloudflare-workers/) ([GitHub](https://github.com/sagi/workers-slack)) since the recommended Slack Bolt and `@slack/web-api` packages are Node based and have issues running in the Cloudflare environment.

## Benefits of the Slack Platform

The newer [Slack Platform](https://api.slack.com/future/quickstart) comes with a few obvious handy features:

- Built-in functions for interacting with Slack APIs
- _"Run on Slack"_ lets you avoid dealing with hosting your own infra
- NoSQL [datastores](https://api.slack.com/future/datastores), so you don't have to host your own persistence

## Benefits of Slack Apps on Cloudflare Workers

Despite not being natively supported by Slack's SDKs, running your app on Cloudflare Workers unlocks a number of commonly needed tools that may make it worth it:

- [Workers KV](https://developers.cloudflare.com/workers/wrangler/workers-kv/), a key-value data store
- [Cron Triggers](https://developers.cloudflare.com/workers/platform/triggers/cron-triggers/)
- [Queues](https://developers.cloudflare.com/queues/)
- [R2](https://developers.cloudflare.com/r2/), similar to S3 for file/blob storage
- [Durable Objects](https://developers.cloudflare.com/workers/learning/using-durable-objects), another way to persist-data across Workers
- _(alpha)_ [D1](https://developers.cloudflare.com/d1), SQLite at the edge

On the surface there's a lot going for the Cloudflare ecosystem - I will add the ⚠️ caveat though: _I have not used them in Production, so cannot speak to availability, uptime, etc. that are important considerations when choosing platforms._

## Run locally

```
make run
```

### Simple Test event

```
make send_test_event
```

Response should look something like _(`404` since it's from us, not Slack)_:

```
./send-test-event.sh
HTTP/1.1 404 Not Found
date: Mon, 27 Feb 2023 03:05:00 GMT
content-type: application/json; charset=UTF-8
vary: Accept-Encoding
server: cloudflare
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked

{"ok":false,"error":"invalid request signature"}
```

## Deploy changes to worker

```
make publish
```

## Tools

### Wrangle

Cloudflare recommends you install the [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) locally to your project, rather than globally. It's annoying to run `npm run wrangle -- < args I actually wanted>`, so I added a simple script `./wrangle` that acts as a proxy to the locally installed version of `wrangler`.

```
# Example
./wrangler secret list
```

### Localhost Tunnels

When developing locally, Slack isn't able to "see" your localhost server to send events to. To get around this, we can use a tool that will forward a public address _(like `https://abc234.ngrok.io`)_ to your `localhost:< your app port>`. You have a couple common options to choose from:

- [`ngrok`](https://ngrok.io) - simple to use, but endpoint changes every time and you have to update in the Slack App Console unless you have the paid version.
- [`Cloudflared`](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/) - newer kid on the block, I haven't used it much yet.

## FAQ

- Getting `Authentication Error [1000]` when using Wrangler?
  - Kind of a PITA, but was able to fix by running `wrangler login` again. Did this a few times, worked every time, though it doesn't seem like the right approach.
  - [More info](https://github.com/cloudflare/wrangler/issues/371)
- Why can't I just use the `@slack/web-api` package?
  - That package depends on Axios for sending requests, which seems like a pain to get working on Cloudflare](https://community.cloudflare.com/t/can-i-use-axios-in-a-worker/168139/2). If you try it, you'll end up with:
    ```
    [WARN]  web-api:WebClient:0 http request failed adapter is not a function
    TypeError: adapter is not a function
        at dispatchRequest (index.js:4214:14)
        at Axios.request (index.js:4488:19)
        at Axios.httpMethod [as post] (index.js:4514:23)
        at Function.wrap [as post] (index.js:3133:19)
    ```

- Seeing in logs: `Your worker called response.clone(), but did not read the body of both clones....`
  - This seems to be happening because of how [The `workers-slack` package](https://github.com/sagi/workers-slack) implements request verification. If it bothers you, you'll either need to submit an Issue and hope for a more efficient function (here or at the package), or write your own Slack verification functionality.
- **< your question here :D >**
