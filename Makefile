
run:
	npx wrangler dev

send_test_event:
	./send-test-event.sh

publish:
	npx wrangler publish src/index.ts --name hono-slack
