# Slack App on Cloudflare Workers

Building out a minimal Slack App on Cloudflare Workers to take advantage of the many utilities that are available (and continue to be released) on their platform.

Uses the [Sagi Slack client for Cloudflare Workers](https://sagi.io/slack-api-for-cloudflare-workers/) ([GitHub](https://github.com/sagi/workers-slack)) since the recommended Slack Bolt and `@slack/web-api` packages are Node based and have issues running in the Cloudflare environment.

## Current State

- Minimal example is functional with events `app_mention` and `app_home_opened`.
- ⚠️ not secure yet as I have not successfully figured out how to map the signature verification from [Slack's SDK](https://github.com/slackapi/node-slack-sdk/blob/main/packages/events-api/src/http-handler.ts#L38) to fit with the Clouflare Workers [WebCrypto](https://developers.cloudflare.com/workers/examples/signing-requests/) utility. Seems close, but not quite there yet.

[Worth checking this link to see if it fixes my crypto problem](https://stackoverflow.com/questions/72315615/wrong-result-with-hmac-verification-using-subtlecrypto-in-javascript).
[This StackOverflow as well](https://stackoverflow.com/questions/67871458/verify-hmac-hash-using-cloudflare-workers)

## Run locally

```
make run
```

## Simple Test event

```
make send_test_event
```

Response should look something like (`404` since it's not from us, not Slack):

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
- < your question here :D >
