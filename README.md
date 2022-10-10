# Slack App on Cloudflare Workers

Building out a minimal Slack App on Cloudflare Workers to take advantage of the many utilities that are available (and continue to be released) on their platform.

## Current State

- Minimal example is functional with events `app_mention` and `app_home_opened`.
- ⚠️ not secure yet as I have not successfully figured out how to map the signature verification from [Slack's SDK](https://github.com/slackapi/node-slack-sdk/blob/main/packages/events-api/src/http-handler.ts#L38) to fit with the Clouflare Workers [WebCrypto](https://developers.cloudflare.com/workers/examples/signing-requests/) utility. Seems close, but not quite there yet.

[Worth checking this link to see if it fixes my crypto problem](https://stackoverflow.com/questions/72315615/wrong-result-with-hmac-verification-using-subtlecrypto-in-javascript).

## Run locally

```
make run
```

## Deploy changes to worker

```
make publish
```

## FAQ

- Getting `Authentication Error [1000]` when using Wrangler?
  - Kind of a PITA, but was able to fix by running `wrangler login` again. Did this a few times, worked every time, though it doesn't seem like the right approach.
  - [More info](https://github.com/cloudflare/wrangler/issues/371)
- ...
