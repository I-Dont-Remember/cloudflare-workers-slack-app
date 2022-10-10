
run:
	npx wrangler dev

publish:
	npx wrangler publish src/index.ts --name hono-slack
